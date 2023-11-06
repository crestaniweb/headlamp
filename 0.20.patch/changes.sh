
#  Local Debug
    # run backens
    ./backend/headlamp-server.exe -dev
    # em outro terminal 
    cd frontend && npm start  # devera abrir o navegador na porta 3000 

# new version
    make all   ( choco install go ? )
    make app-win

# apply 
cp 0.20.patch/1111/helper_index.ts  frontend/src/helpers/index.ts                     
   # - add function para retornar o profile DEV ou ADMIN salvo
cp 0.20.patch/1111/app_Settings.tsx  frontend/src/components/App/Settings/Settings.tsx 
   # - adicionado opção Profile : DEV | ADMIN
cp 0.20.patch/1111/route_prepareRoutes.ts frontend/src/components/Sidebar/prepareRoutes.ts  
   # - aqui tem definição dos menus.
   # - ocutamos menus que nao tem uso no cluster
cp 0.20.patch/1111/startup_index.tst   frontend/src/index.tsx                            
   # - localStorage.setItem('disable_update_check', 'true');
cp 0.20.patch/1111/pod_Details.tsx  frontend/src/components/pod/Details.tsx           
   # - add componente PodMetrics
cp 0.20.patch/1111/PodMetricsFromPrometheus.tsx  frontend/src/components/common/PodMetricsFromPrometheus.tsx  
   # - podMetrics from prometheus
cp 0.20.patch/1111/CreateButton.tsx frontend/src/components/common/Resource/CreateButton.tsx 
    # if (value.reason)
    #    msg = msg + '[' + value.reason  + ']';
     
# backup
cp frontend/src/helpers/index.ts                     0.20.patch/1111/helper_index.ts
cp frontend/src/components/App/Settings/Settings.tsx 0.20.patch/1111/app_Settings.tsx
cp frontend/src/components/Sidebar/prepareRoutes.ts  0.20.patch/1111/route_prepareRoutes.ts
cp frontend/src/index.tsx                            0.20.patch/1111/startup_index.tst  
cp frontend/src/components/pod/Details.tsx           0.20.patch/1111/pod_Details.tsx
cp frontend/src/components/common/PodMetricsFromPrometheus.tsx  0.20.patch/1111/PodMetricsFromPrometheus.tsx
cp frontend/src/components/common/Resource/CreateButton.tsx 0.20.patch/1111/CreateButton.tsx

##
#