// GraphQL response types 
export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string; type?: string }>;
}

// User 
export interface UserData {
  user: {
    id: string;
    createdAt: string;
    avatarUrl: string;
    followers: { totalCount: number };
  };
}

// Contributions 
export interface ContributionsData {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number;
      };
    };
  };
}

// Repositories (stars + repo count)
export interface RepoNode {
  nameWithOwner: string;
  stargazers: { totalCount: number };
  defaultBranchRef: {
    target: {
      history: { totalCount: number };
    };
  } | null;
}

export interface ReposData {
  viewer: {
    repositories: {
      totalCount: number;
      edges: Array<{ node: RepoNode | null }>;
      pageInfo: { endCursor: string | null; hasNextPage: boolean };
    };
  };
}

// Commit history (LOC counting) 
export interface CommitNode {
  committedDate: string;
  author: { user: { id: string } | null };
  additions: number;
  deletions: number;
}

export interface CommitHistoryData {
  repository: {
    defaultBranchRef: {
      target: {
        history: {
          totalCount: number;
          edges: Array<{ node: CommitNode }>;
          pageInfo: { endCursor: string | null; hasNextPage: boolean };
        };
      };
    } | null;
  };
}

// Pinned repositories 
export interface PinnedRepoNode {
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  homepageUrl: string | null;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string; color: string } | null;
}

export interface PinnedReposData {
  user: {
    pinnedItems: {
      nodes: PinnedRepoNode[];
    };
  };
}

// Aggregated stats 
export interface UserStats {
  age: string;
  totalCommits: number;
  totalStars: number;
  totalRepos: number;
  totalContribRepos: number;
  followers: number;
  locAdded: number;
  locDeleted: number;
  locNet: number;
  avatarUrl: string;
  pinnedRepos: PinnedRepoNode[];
}

// Cache 
export interface CacheEntry {
  repoHash: string;
  commitCount: number;
  myCommits: number;
  additions: number;
  deletions: number;
}
