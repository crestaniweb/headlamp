import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

import { SectionBox } from '.';
//import { useTranslation } from 'react-i18next';
import { KubeObject } from '../../lib/k8s/cluster';
import { makeStyles } from '@material-ui/core/styles';
import {  request  } from '../../lib/k8s/apiProxy';

const useStyles = makeStyles({
  table: {        
    width: '1400px',
  }, 
});

function formatTimestamp(timestamp: number) {  
  const date = new Date(timestamp);//.toLocaleString('en-US', storedTimezone);  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0'); 
  return `${hours}:${minutes}`;
}

function round3(number: number): number {
  return parseFloat(number.toPrecision(3));
}

export interface PodMetricsFromPrometheusProps {
  item: any[] | null;
}

export function PodMetricsFromPrometheus(props: PodMetricsFromPrometheusProps) {
  const { item } = props;
  //const { t } = useTranslation();  
  const [cpuData, setCpuData] = useState<any[]>([]);
  const [memoryData, setMemoryData] = useState<any[]>([]);
  const classes = useStyles();  
  const [limitCpu, setLimitCpu] = useState<any>();
  const [limitMemory, setLimitMemory] = useState<any>([]);
 
  function getDefaultContainer() {
    const itemObj= (item as KubeObject);
    return itemObj.spec.containers.length > 0 ? itemObj.spec.containers[0] : '';
  }

  //console.log(limitMemory);

  async function fetchEvents() {  
    if (item) {
      
      // Nome do pod
      const podName = (item as KubeObject).metadata.name;

      try{   
        // configura imites de cpu e memoria antes de montar o grafico      
        let lCpu = getDefaultContainer().resources?.limits?.cpu;       
        if (lCpu) {
          if (lCpu.indexOf('m') > 0 ){
            // https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
            // valid values '2000m',  '2', '0.5'
            lCpu=lCpu.replace('m','') / 1000;            
            lCpu=parseFloat(lCpu.toPrecision(1));
          }
          setLimitCpu(lCpu);          
        }
        let lMemory = getDefaultContainer().resources?.limits?.memory;       
        if (lMemory) {
          // https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
          // Pay attention to the case of the suffixes! 
          //  400m of memory is a request for 0.4 bytes. Not same of 400Mi  or 400M  
          lMemory=lMemory.replace('Gi', '000').replace('Mi','').replace('G','000').replace('M','');
          setLimitMemory(lMemory);          
        }               
      } catch (error) {
        console.error('Error while setting limits' + error);
      }

      // Intervalo de tempo (última hora)    
      const startTime = new Date();
      const endTime = new Date();    
      startTime.setHours(endTime.getHours() - 3);
           
      //  '&query=sum(rate(container_cpu_usage_seconds_total{pod="' +            

      const cpuData =
            '/api/v1/namespaces/lens-metrics/services/prometheus:80/proxy/api/v1/query_range?start=' +
            startTime.getTime() / 1000 +
            '&end=' +
            endTime.getTime() / 1000 +
            '&query=sum(rate(container_cpu_usage_seconds_total{pod="' +            
            podName +
            '",container!="POD",container!=""}[120s]))&step=60';
            
      const memData =
            '/api/v1/namespaces/lens-metrics/services/prometheus:80/proxy/api/v1/query_range?start=' +
            startTime.getTime() / 1000 +
            '&end=' +
            endTime.getTime() / 1000 +
            '&query=sum(container_memory_working_set_bytes{pod="' +
            podName +
            '",container!="POD",container!=""})&step=60';

      const vlrData= await request(cpuData, {} , true, true, {} );
      setCpuData(transformCpuData(vlrData));
        
      const vlrDataMem= await request(memData, {} , true, true, {} );
      setMemoryData(transformMemoryData(vlrDataMem));

    }
  }

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(() => {
      fetchEvents();
    }, 15000); // 15 seconds
    return () => clearInterval(interval); // Clear interval on unmount
  }, [ item ]);  //  , cpuData, memoryData

  function transformCpuData(vData: any) {  
    const returData = [];   
    //console.log(vData);
    for (let i = 0; i < vData.data.result[0].values.length; i++) {
      let kv = vData.data.result[0].values[i]; 
      returData.push({
        time: formatTimestamp(kv[0] * 1000),
        cpu: round3(kv[1] * 1)
      });
    }   
    //console.log(returData) ;
    return returData;
  }

  function transformMemoryData(vData: any) {  
    const returData = [];   
    for (let i = 0; i < vData.data.result[0].values.length; i++) {
      let kv = vData.data.result[0].values[i]; 
      returData.push({
        time: formatTimestamp(kv[0] * 1000),
        memory: round3((kv[1] / 1024 / 1024)) 
      });
    }
    return returData;
  }

  return (    
    <SectionBox title="PodMetrics" >
      {cpuData.length > 0 && (
        <LineChart width={1400} height={250} data={cpuData} className={classes.table}>
        <XAxis dataKey="time" />
        <YAxis />
        <CartesianGrid stroke="#eee" strokeDasharray="5 5" />                
        <Legend />
        <Line name="vCPU" type="monotone" dataKey="cpu" stroke="#F00000" dot={false} />
        {limitCpu && (
            <Line
              name="LimitCpu"
              type="monotone"
              dataKey="limitCpu"
              stroke="#000F00"              
              dot={false}
              data={cpuData.map(dataPoint => ({ time: dataPoint.time, limitCpu }))}
          />
        )}
        </LineChart>
      )}
      {memoryData.length > 0 && (
        <LineChart width={1400} height={250} data={memoryData} className={classes.table}>
          <XAxis dataKey="time" />
          <YAxis />  
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />                
          <Legend />          
          <Line name="Memory(MB)" type="monotone" dataKey="memory" stroke="#0A009d" dot={false} />       
          {limitMemory && (
            <Line
              name="LimitMemory"
              type="monotone"
              dataKey="limitMemory"
              stroke="#000F00"             
              dot={false}
              data={memoryData.map(dataPoint => ({ time: dataPoint.time, limitMemory }))}
          />
        )}
        </LineChart>
      )}
    </SectionBox>
  );

} 
