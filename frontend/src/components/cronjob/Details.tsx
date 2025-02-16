import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Input,
  InputLabel,
} from '@material-ui/core';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { apply } from '../../lib/k8s/apiProxy';
import { KubeObjectInterface } from '../../lib/k8s/cluster';
import CronJob from '../../lib/k8s/cronJob';
import Job from '../../lib/k8s/job';
import { clusterAction } from '../../redux/actions/actions';
import { ActionButton, ObjectEventList } from '../common';
import { MainInfoSection } from '../common/Resource';
import AuthVisible from '../common/Resource/AuthVisible';
import DetailsViewSection from '../DetailsViewSection';
import { JobsListRenderer } from '../job/List';
import { getLastScheduleTime, getSchedule } from './List';

function SpawnJobDialog(props: {
  cronJob: CronJob;
  applyFunc: (newItem: KubeObjectInterface) => Promise<JSON>;
  openJobDialog: boolean;
  setOpenJobDialog: (open: boolean) => void;
}) {
  const { cronJob, openJobDialog, setOpenJobDialog, applyFunc } = props;
  const { namespace } = useParams<{ namespace: string }>();
  const { t } = useTranslation(['translation']);
  const dispatch = useDispatch();
  // method to generate a unique string
  const uniqueString = () => {
    const timestamp = Date.now().toString(36);
    const randomNum = Math.random().toString(36).substr(2, 5);
    return `${timestamp}-${randomNum}`;
  };

  const job = _.cloneDeep(cronJob.spec.jobTemplate);
  const [jobName, setJobName] = useState(
    `${cronJob?.metadata?.name}-manual-spawn-${uniqueString()}`
  );

  // set all the fields that are assumed on the jobTemplate
  job.kind = 'Job';
  job.metadata = _.cloneDeep(job.metadata) || {};
  job.metadata.namespace = namespace;
  job.apiVersion = 'batch/v1';
  job.metadata.name = jobName;

  function handleClose() {
    setOpenJobDialog(false);
  }

  return (
    <Dialog
      open={openJobDialog}
      onClose={handleClose}
      aria-labelledby="form-dialog-title"
      maxWidth="sm"
    >
      <DialogTitle id="form-dialog-title">{t('translation|Spawn Job')}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('translation|This will trigger a new Job based on the CronJob {{ name }}', {
            name,
          })}
        </DialogContentText>
        <Box mb={1}>
          <InputLabel htmlFor="name">{t('translation|Job Name')}</InputLabel>
        </Box>
        <Input
          margin="dense"
          id="name"
          type="text"
          fullWidth
          value={jobName}
          onChange={e => {
            setJobName(e.target.value);
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          {t('translation|Cancel')}
        </Button>
        <Button
          onClick={() => {
            handleClose();
            dispatch(
              clusterAction(() => applyFunc(job), {
                startMessage: t('translation|Spawning Job {{ newItemName }}…', {
                  newItemName: job.metadata.name,
                }),
                successMessage: t('translation|Job {{ newItemName }} spawned', {
                  newItemName: job.metadata.name,
                }),
                errorMessage: t('translation|Failed to spawn Job {{ newItemName }}', {
                  newItemName: job.metadata.name,
                }),
              })
            );
          }}
          color="primary"
        >
          {t('translation|Spawn')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CronJobDetails() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const { t, i18n } = useTranslation('glossary');

  const [jobs, jobsError] = Job.useList();
  const [cronJob, cronJobError] = CronJob.useGet(name, namespace);
  const [isCronSuspended, setIsCronSuspended] = useState(false);
  const [isCheckingCronSuspendStatus, setIsCheckingCronSuspendStatus] = useState(true);
  const [openJobDialog, setOpenJobDialog] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (cronJob) {
      setIsCronSuspended(cronJob.spec.suspend);
      setIsCheckingCronSuspendStatus(false);
    }
  }, [cronJob]);

  function filterOwnedJobs(jobs?: Job[] | null) {
    if (!jobs) {
      return null;
    }

    return jobs.filter(job => {
      type OwnerRef = {
        name: string;
        kind: string;
      };
      return !!job.metadata?.ownerReferences?.find(
        (ownerRef: OwnerRef) => ownerRef.kind === 'CronJob' && ownerRef.name === name
      );
    });
  }

  const ownedJobs = filterOwnedJobs(jobs);

  function applyFunc(newItem: KubeObjectInterface) {
    if (newItem.kind === 'CronJob') {
      setIsCheckingCronSuspendStatus(true);
    } else if (newItem.kind === 'Job') {
      setOpenJobDialog(false);
    }
    return apply(newItem).finally(() => {
      setIsCheckingCronSuspendStatus(false);
    });
  }

  function PauseResumeAction() {
    return (
      <ActionButton
        description={isCronSuspended ? t('translation|Resume') : t('translation|Suspend')}
        onClick={() => {
          handleCron(!isCronSuspended);
        }}
        icon={isCronSuspended ? 'mdi:play-circle' : 'mdi:pause-circle'}
        iconButtonProps={{
          disabled: isCheckingCronSuspendStatus,
        }}
      />
    );
  }

  function handleCron(suspend: boolean) {
    const clonedCronJob = _.cloneDeep(cronJob);
    clonedCronJob.spec.suspend = suspend;
    setIsCheckingCronSuspendStatus(true);
    dispatch(
      clusterAction(() => applyFunc(clonedCronJob.jsonData), {
        startMessage: suspend
          ? t('translation|Suspending CronJob {{ newItemName }}…', {
              newItemName: clonedCronJob.metadata.name,
            })
          : t('translation|Resuming CronJob {{ newItemName }}…', {
              newItemName: clonedCronJob.metadata.name,
            }),
        cancelledMessage: suspend
          ? t('translation|Cancelled suspending CronJob {{ newItemName }}.', {
              newItemName: clonedCronJob.metadata.name,
            })
          : t('translation|Cancelled resuming CronJob {{ newItemName }}.', {
              newItemName: clonedCronJob.metadata.name,
            }),
        successMessage: suspend
          ? t('translation|Suspended CronJob {{ newItemName }}.', {
              newItemName: clonedCronJob.metadata.name,
            })
          : t('translation|Resumed CronJob {{ newItemName }}.', {
              newItemName: clonedCronJob.metadata.name,
            }),
        errorMessage: suspend
          ? t('translation|Failed to suspend CronJob {{ newItemName }}.', {
              newItemName: clonedCronJob.metadata.name,
            })
          : t('translation|Failed to resume CronJob {{ newItemName }}.', {
              newItemName: clonedCronJob.metadata.name,
            }),
      })
    );
  }

  const actions = [];

  actions.push(
    cronJob && (
      <AuthVisible authVerb="create" item={Job} namespace={cronJob.getNamespace()}>
        <ActionButton
          description={t('translation|Spawn Job')}
          onClick={() => {
            setOpenJobDialog(true);
          }}
          icon="mdi:lightning-bolt-circle"
        />
        {openJobDialog && (
          <SpawnJobDialog
            cronJob={cronJob}
            openJobDialog={openJobDialog}
            setOpenJobDialog={setOpenJobDialog}
            applyFunc={applyFunc}
          />
        )}
      </AuthVisible>
    )
  );

  actions.push(
    <AuthVisible authVerb="update" item={cronJob}>
      <PauseResumeAction />
    </AuthVisible>
  );

  return (
    <>
      <MainInfoSection
        resource={cronJob}
        actions={actions}
        error={CronJob.getErrorMessage(cronJobError)}
        extraInfo={item =>
          item && [
            {
              name: t('Schedule'),
              value: getSchedule(item, i18n.language),
            },
            {
              name: t('translation|Suspend'),
              value: item.spec.suspend.toString(),
            },
            {
              name: t('Starting deadline'),
              value: `${item.spec.startingDeadlineSeconds}s`,
              hide: !item.spec.startingDeadlineSeconds,
            },
            {
              name: t('Last Schedule'),
              value: getLastScheduleTime(item),
            },
          ]
        }
      />
      {cronJob && <JobsListRenderer jobs={ownedJobs} error={CronJob.getErrorMessage(jobsError)} />}
      <DetailsViewSection resource={cronJob} />
      {cronJob && <ObjectEventList object={cronJob} />}
    </>
  );
}
