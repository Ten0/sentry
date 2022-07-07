import {InjectedRouter} from 'react-router';

import {initializeOrg} from 'sentry-test/initializeOrg';

import GlobalModal from 'sentry/components/globalModal';
import {Organization, Project} from 'sentry/types';
import {
  SamplingConditionOperator,
  SamplingRule,
  SamplingRuleType,
} from 'sentry/types/sampling';
import importedUseProjects from 'sentry/utils/useProjects';
import {OrganizationContext} from 'sentry/views/organizationContext';
import {RouteContext} from 'sentry/views/routeContext';
import ServerSideSampling from 'sentry/views/settings/project/server-side-sampling';
import importedUseProjectStats from 'sentry/views/settings/project/server-side-sampling/utils/useProjectStats';
import importedUseSamplingDistribution from 'sentry/views/settings/project/server-side-sampling/utils/useSamplingDistribution';
import importedUseSdkVersions from 'sentry/views/settings/project/server-side-sampling/utils/useSdkVersions';

export const uniformRule: SamplingRule = {
  sampleRate: 0.5,
  type: SamplingRuleType.TRACE,
  active: false,
  condition: {
    op: SamplingConditionOperator.AND,
    inner: [],
  },
  id: 1,
};

export const mockedProjects = [
  TestStubs.Project({
    name: 'javascript',
    slug: 'javascript',
    id: 1,
  }),
  TestStubs.Project({
    name: 'sentry',
    slug: 'sentry',
    platform: 'python',
    id: 2,
  }),
  TestStubs.Project({
    id: 4,
    dynamicSampling: {
      rules: [
        {
          sampleRate: 1,
          type: 'trace',
          active: false,
          condition: {
            op: 'and',
            inner: [],
          },
          id: 1,
        },
      ],
    },
  }),
];

export const mockedSamplingSdkVersions = [
  {
    project: mockedProjects[0].slug,
    latestSDKVersion: '1.0.3',
    latestSDKName: 'sentry.javascript.react',
    isSendingSampleRate: true,
  },
  {
    project: mockedProjects[1].slug,
    latestSDKVersion: '1.0.2',
    latestSDKName: 'sentry.python',
    isSendingSampleRate: false,
  },
];

jest.mock('sentry/utils/useProjects');
const useProjects = importedUseProjects as jest.MockedFunction<
  typeof importedUseProjects
>;
useProjects.mockImplementation(() => ({
  projects: mockedProjects,
  fetchError: null,
  fetching: false,
  hasMore: false,
  initiallyLoaded: true,
  onSearch: jest.fn(),
  placeholders: [],
}));

jest.mock('sentry/views/settings/project/server-side-sampling/utils/useProjectStats');
const useProjectStats = importedUseProjectStats as jest.MockedFunction<
  typeof importedUseProjectStats
>;
useProjectStats.mockImplementation(() => ({
  projectStats: TestStubs.Outcomes(),
  loading: false,
  error: undefined,
  projectStatsSeries: [],
}));

jest.mock(
  'sentry/views/settings/project/server-side-sampling/utils/useSamplingDistribution'
);

const useSamplingDistribution = importedUseSamplingDistribution as jest.MockedFunction<
  typeof importedUseSamplingDistribution
>;

useSamplingDistribution.mockImplementation(() => ({
  samplingDistribution: {
    project_breakdown: [
      {
        project: mockedProjects[0].slug,
        project_id: mockedProjects[0].id,
        'count()': 888,
      },
      {
        project: mockedProjects[1].slug,
        project_id: mockedProjects[1].id,
        'count()': 100,
      },
    ],
    sample_size: 100,
    null_sample_rate_percentage: 98,
    sample_rate_distributions: {
      min: 1,
      max: 1,
      avg: 1,
      p50: 1,
      p90: 1,
      p95: 1,
      p99: 1,
    },
  },
}));

jest.mock('sentry/views/settings/project/server-side-sampling/utils/useSdkVersions');
const useSdkVersions = importedUseSdkVersions as jest.MockedFunction<
  typeof importedUseSdkVersions
>;

useSdkVersions.mockImplementation(() => ({
  samplingSdkVersions: mockedSamplingSdkVersions,
}));

export function getMockData({
  projects,
  access,
}: {access?: string[]; projects?: Project[]} = {}) {
  return initializeOrg({
    ...initializeOrg(),
    organization: {
      ...initializeOrg().organization,
      features: ['server-side-sampling'],
      access: access ?? initializeOrg().organization.access,
      projects,
    },
    projects,
  });
}

export function TestComponent({
  router,
  project,
  organization,
  withModal,
}: {
  organization: Organization;
  project: Project;
  router: InjectedRouter;
  withModal?: boolean;
}) {
  return (
    <RouteContext.Provider
      value={{
        router,
        location: router.location,
        params: {
          orgId: organization.slug,
          projectId: project.slug,
        },
        routes: [],
      }}
    >
      {withModal && <GlobalModal />}
      <OrganizationContext.Provider value={organization}>
        <ServerSideSampling project={project} />
      </OrganizationContext.Provider>
    </RouteContext.Provider>
  );
}
