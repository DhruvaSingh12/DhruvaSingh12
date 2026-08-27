import { graphql, queryCount } from './graphql.js';
import { readCache, repoHash, writeCache } from './cache.js';
import type {
  CacheEntry,
  CommitHistoryData,
  ContributionsData,
  PinnedRepoNode,
  PinnedReposData,
  RepoNode,
  ReposData,
  UserData,
  UserStats,
} from './types.js';

const USER_NAME = process.env.USER_NAME ?? '';
if (!USER_NAME) throw new Error('USER_NAME environment variable is required');

// Helpers 
function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function ageString(birthday: Date): string {
  const now = new Date();
  let years = now.getFullYear() - birthday.getFullYear();
  let months = now.getMonth() - birthday.getMonth();
  let days = now.getDate() - birthday.getDate();
  if (days < 0) {
    months--;
    const prev = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prev.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  const bday = months === 0 && days === 0 ? ' 🎂' : '';
  return `${plural(years, 'year')}, ${plural(months, 'month')}, ${plural(days, 'day')}${bday}`;
}

// Individual data fetchers 
async function fetchUserData(): Promise<{ id: string; avatarUrl: string; createdAt: string; followers: number }> {
  queryCount('user_getter');
  const data = await graphql<UserData>(
    `query($login: String!) {
      user(login: $login) {
        id
        createdAt
        avatarUrl
        followers { totalCount }
      }
    }`,
    { login: USER_NAME },
  );
  return {
    id: data.user.id,
    avatarUrl: data.user.avatarUrl,
    createdAt: data.user.createdAt,
    followers: data.user.followers.totalCount,
  };
}

async function fetchYearCommits(from: string, to: string): Promise<number> {
  queryCount('graph_commits');
  const data = await graphql<ContributionsData>(
    `query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar { totalContributions }
        }
      }
    }`,
    { login: USER_NAME, from, to },
  );
  return data.user.contributionsCollection.contributionCalendar.totalContributions;
}

async function fetchTotalCommits(accountCreated: string): Promise<number> {
  const start = new Date(accountCreated);
  const now = new Date();
  let total = 0;
  let year = start.getFullYear();
  while (year <= now.getFullYear()) {
    const from = new Date(Math.max(new Date(year, 0, 1).getTime(), start.getTime())).toISOString();
    const to = new Date(Math.min(new Date(year + 1, 0, 1).getTime(), now.getTime())).toISOString();
    total += await fetchYearCommits(from, to);
    year++;
  }
  return total;
}

async function fetchAllRepos(
  affiliations: string[],
  cursor: string | null = null,
  acc: RepoNode[] = [],
): Promise<{ totalCount: number; repos: RepoNode[] }> {
  queryCount('graph_repos_stars');
  const data = await graphql<ReposData>(
    `query($login: String!, $affiliations: [RepositoryAffiliation], $cursor: String) {
      user(login: $login) {
        repositories(first: 100, after: $cursor, ownerAffiliations: $affiliations) {
          totalCount
          edges { node { nameWithOwner stargazers { totalCount } defaultBranchRef { target { ... on Commit { history { totalCount } } } } } }
          pageInfo { endCursor hasNextPage }
        }
      }
    }`,
    { login: USER_NAME, affiliations, cursor },
  );
  const edges = data.user.repositories.edges.filter((e) => e.node !== null);
  const repos = [...acc, ...edges.map((e) => e.node!)];
  if (data.user.repositories.pageInfo.hasNextPage) {
    return fetchAllRepos(affiliations, data.user.repositories.pageInfo.endCursor, repos);
  }
  return { totalCount: data.user.repositories.totalCount, repos };
}

async function fetchRepoLoc(
  owner: string,
  repoName: string,
  userId: string,
  cursor: string | null = null,
  addTotal = 0,
  delTotal = 0,
  myCommits = 0,
): Promise<{ additions: number; deletions: number; myCommits: number }> {
  queryCount('recursive_loc');
  const data = await graphql<CommitHistoryData>(
    `query($owner: String!, $name: String!, $cursor: String) {
      repository(name: $name, owner: $owner) {
        defaultBranchRef {
          target { ... on Commit {
            history(first: 100, after: $cursor) {
              totalCount
              edges { node { committedDate author { user { id } } additions deletions } }
              pageInfo { endCursor hasNextPage }
            }
          }}
        }
      }
    }`,
    { owner, name: repoName, cursor },
  );

  const branch = data.repository.defaultBranchRef;
  if (!branch) return { additions: 0, deletions: 0, myCommits: 0 };

  const history = branch.target.history;
  for (const edge of history.edges) {
    if (edge.node.author?.user?.id === userId) {
      myCommits++;
      addTotal += edge.node.additions;
      delTotal += edge.node.deletions;
    }
  }

  if (history.pageInfo.hasNextPage) {
    return fetchRepoLoc(owner, repoName, userId, history.pageInfo.endCursor, addTotal, delTotal, myCommits);
  }
  return { additions: addTotal, deletions: delTotal, myCommits };
}

async function fetchPinnedRepos(): Promise<PinnedRepoNode[]> {
  queryCount('pinned_repos');
  const data = await graphql<PinnedReposData>(
    `query($login: String!) {
      user(login: $login) {
        pinnedItems(first: 6, types: [REPOSITORY]) {
          nodes {
            ... on Repository {
              name
              nameWithOwner
              description
              url
              homepageUrl
              stargazerCount
              forkCount
              primaryLanguage { name color }
            }
          }
        }
      }
    }`,
    { login: USER_NAME },
  );
  return data.user.pinnedItems.nodes;
}

// LOC with caching 
async function fetchLocWithCache(
  repos: RepoNode[],
  userId: string,
): Promise<{ added: number; deleted: number; net: number }> {
  const cache = readCache(USER_NAME);
  const cacheMap = new Map<string, CacheEntry>();
  for (const entry of cache) cacheMap.set(entry.repoHash, entry);

  const newEntries: CacheEntry[] = [];
  let totalAdd = 0;
  let totalDel = 0;

  for (const repo of repos) {
    const hash = repoHash(repo.nameWithOwner);
    const commitCount = repo.defaultBranchRef?.target?.history?.totalCount ?? 0;
    const cached = cacheMap.get(hash);

    if (cached && cached.commitCount === commitCount) {
      // Repo unchanged — use cached LOC
      newEntries.push(cached);
      totalAdd += cached.additions;
      totalDel += cached.deletions;
    } else {
      // Repo changed or new — re-fetch LOC
      const [owner, name] = repo.nameWithOwner.split('/');
      console.log(`  📊 Fetching LOC for ${repo.nameWithOwner}…`);
      try {
        const loc = await fetchRepoLoc(owner, name, userId);
        const entry: CacheEntry = {
          repoHash: hash,
          commitCount,
          myCommits: loc.myCommits,
          additions: loc.additions,
          deletions: loc.deletions,
        };
        newEntries.push(entry);
        totalAdd += loc.additions;
        totalDel += loc.deletions;
      } catch (err) {
        console.warn(`  ⚠ Failed to fetch LOC for ${repo.nameWithOwner}:`, err);
        // Preserve old cache entry if available
        if (cached) {
          newEntries.push(cached);
          totalAdd += cached.additions;
          totalDel += cached.deletions;
        } else {
          newEntries.push({ repoHash: hash, commitCount: 0, myCommits: 0, additions: 0, deletions: 0 });
        }
      }
    }
  }

  writeCache(USER_NAME, newEntries);
  return { added: totalAdd, deleted: totalDel, net: totalAdd - totalDel };
}

// Main export 
export async function fetchAllStats(): Promise<UserStats> {
  console.log('⏳ Fetching GitHub stats…\n');

  // 1. User data (id, avatar, followers)
  console.log('  👤 User data…');
  const user = await fetchUserData();

  // 2. Age
  const birthday = new Date(2005, 1, 12); // February 12, 2005
  const age = ageString(birthday);
  console.log(`  🎂 Age: ${age}`);

  // 3. Total commits
  console.log('  📝 Commits…');
  const totalCommits = await fetchTotalCommits(user.createdAt);
  console.log(`     ${totalCommits.toLocaleString()} commits`);

  // 4. Repos + stars (owned)
  console.log('  ⭐ Repos & stars…');
  const owned = await fetchAllRepos(['OWNER']);
  const totalStars = owned.repos.reduce((sum, r) => sum + r.stargazers.totalCount, 0);
  const totalRepos = owned.totalCount;

  // 5. Contributed repos
  const contrib = await fetchAllRepos(['OWNER', 'COLLABORATOR', 'ORGANIZATION_MEMBER']);
  const totalContribRepos = contrib.totalCount;

  // 6. LOC
  console.log('  📏 Lines of code (this may take a while)…');
  const allRepos = await fetchAllRepos(['OWNER', 'COLLABORATOR', 'ORGANIZATION_MEMBER']);
  const loc = await fetchLocWithCache(allRepos.repos, user.id);
  console.log(`     +${loc.added.toLocaleString()} / -${loc.deleted.toLocaleString()} = ${loc.net.toLocaleString()} net`);

  // 7. Pinned repos
  console.log('  📌 Pinned repos…');
  const pinnedRepos = await fetchPinnedRepos();
  console.log(`     ${pinnedRepos.length} pinned repos found`);

  console.log('\n✅ All stats fetched!\n');

  return {
    age,
    totalCommits,
    totalStars,
    totalRepos,
    totalContribRepos,
    followers: user.followers,
    locAdded: loc.added,
    locDeleted: loc.deleted,
    locNet: loc.net,
    avatarUrl: user.avatarUrl,
    pinnedRepos,
  };
}
