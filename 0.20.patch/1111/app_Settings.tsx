import React, { useState, useEffect, ChangeEvent } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Box, FormControl, MenuItem, Select } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import LocaleSelect from '../../../i18n/LocaleSelect/LocaleSelect';
import { setVersionDialogOpen } from '../../../redux/actions/actions';
import { setAppSettings } from '../../../redux/configSlice';
import { defaultTableRowsPerPageOptions } from '../../../redux/configSlice';
import { ActionButton, NameValueTable, SectionBox } from '../../common';
import TimezoneSelect from '../../common/TimezoneSelect';
import { useSettings } from './hook';
import NumRowsInput from './NumRowsInput';
import ThemeChangeButton from './ThemeChangeButton';

import helpers from '../../../helpers';

const CLUSTER_RESOURCES_DEFAULT = 'DEFAULT'; //hide not used resources
const CLUSTER_RESOURCES_ALL = 'SHOW_ALL';

const CLUSTER_PROFILE = 'CLUSTER_ADMIN';
const CLUSTER_PROFILE_DEFAULT = 'DEFAULT';

// quando show_all apresenta todos os itens do menu
// quando profile cluster_admin apresenta, por exemplo, DaemonSets

const useStyles = makeStyles(theme => ({
  valueCol: {
    width: '60%',
    [theme.breakpoints.down('sm')]: {
      width: 'unset',
    },
  },
}));

interface ClusterResourcesProps {
  option: string;
  onChange: (showResources: string) => void;
}
interface ProfileProps {
  option: string;
  onChange: (newProfile: string) => void;
}

export function SelectClusterResource({ option, onChange }: ClusterResourcesProps) {
  const handleChange = (event: ChangeEvent<{ value: unknown }>) => {
    onChange(event.target.value as string);    
    helpers.storeOptionClusterResources(event.target.value as string);    
  };
  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl>        
        <Select
           labelId="cluster-resources-label"
           id="cluster-resources"
           value={option}
           label="clusterLabel"
           onChange={handleChange} >
          <MenuItem value={CLUSTER_RESOURCES_DEFAULT}>Ocultar Recursos Nao Usados</MenuItem>
          <MenuItem value={CLUSTER_RESOURCES_ALL}>Mostrar todos os Recursos</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}

export function SelectProfile({ option, onChange }: ProfileProps) {
  const handleChange = (event: ChangeEvent<{ value: unknown }>) => {
    onChange(event.target.value as string);    
    helpers.storeClusterProfile(event.target.value as string);    
  };
  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl>        
        <Select
           labelId="profile-select-label"
           id="profile-select"
           value={option}
           label="profileLabel"
           onChange={handleChange} >          
          <MenuItem value={CLUSTER_PROFILE}>Admin</MenuItem>
          <MenuItem value={CLUSTER_PROFILE_DEFAULT}>Default</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}


export default function Settings() {
  const classes = useStyles();
  const { t } = useTranslation(['settings', 'frequent']);
  const settingsObj = useSettings();
  const storedTimezone = settingsObj.timezone;
  const storedRowsPerPageOptions = settingsObj.tableRowsPerPageOptions;
  //const storedProfile = settingsObj.profile;
  const [clusterShowResources, setClusterShowResources] = useState<string>(helpers.getOptionClusterResources);
  const [profile, setProfile] = useState<string>(helpers.getClusterProfile);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    storedTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const dispatch = useDispatch();
  
  useEffect(() => {
    dispatch(
      setAppSettings({
        timezone: selectedTimezone,
        clusterShowResources: clusterShowResources,
        profile: profile, // Make sure to dispatch the profile here as well if it's not being dispatched elsewhere
      })
    );
  }, [selectedTimezone, clusterShowResources, profile, dispatch]);

  return (
    <SectionBox
      title={t('frequent|General Settings')}
      headerProps={{
        actions: [
          <ActionButton
            key="version"
            icon="mdi:information-outline"
            description={t('frequent|Version')}
            onClick={() => {
              dispatch(setVersionDialogOpen(true));
            }}
          />,
        ],
      }}
      backLink
    >
      <NameValueTable
        valueCellProps={{ className: classes.valueCol }}
        rows={[
          {
            name: t('frequent|Language'),
            value: <LocaleSelect showFullNames formControlProps={{ className: '' }} />,
          },
          {
            name: t('frequent|Theme'),
            value: <ThemeChangeButton showBothIcons />,
          },
          {
            name: t('settings|Number of rows for tables'),
            value: (
              <NumRowsInput
                defaultValue={storedRowsPerPageOptions || defaultTableRowsPerPageOptions}
              />
            ),
          },
          {
            name: t('settings|Timezone to display for dates'),
            value: (
              <Box maxWidth="350px">
                <TimezoneSelect
                  initialTimezone={selectedTimezone}
                  onChange={name => setSelectedTimezone(name)}
                />
              </Box>
            ),
          },
          {
            name: 'Version Update',
            value: 'disabled',
          },
          {
            name: 'Resursos do Cluster',
            value: (
              <SelectClusterResource 
                option={clusterShowResources} 
                onChange={showResources => setClusterShowResources(showResources)}
              />
            ),
          },
          {
            name: 'Profile Default',
            value: (
              <SelectProfile 
                option={profile} 
                onChange={newProfile => setProfile(newProfile)}
              />
            ),
          },
        ]}
      />
    </SectionBox>
  );
}