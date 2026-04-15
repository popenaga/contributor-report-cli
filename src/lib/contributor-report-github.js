import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export function parseGitHubRepoSlug(remoteUrl) {
  const trimmed = String(remoteUrl).trim()
  const match = trimmed.match(/github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/i)
  return match ? match[1] : null
}

export function detectGitHubRepoSlug(repoRoot = process.cwd()) {
  const raw = execFileSync('git', ['remote', 'get-url', 'origin'], {
    cwd: repoRoot,
    encoding: 'utf8'
  }).trim()
  return parseGitHubRepoSlug(raw)
}

export function fetchMergedPrs({ repoSlug, from, to }) {
  const query = `query {
    search(query: "repo:${repoSlug} is:pr is:merged merged:${from}..${to}", type: ISSUE, first: 100) {
      issueCount
      nodes {
        ... on PullRequest {
          number
          title
          createdAt
          mergedAt
          comments { totalCount }
          reviews(first: 100) {
            totalCount
            nodes {
              author { __typename login }
              comments { totalCount }
            }
          }
          commits(first: 30) {
            nodes {
              commit {
                authors(first: 10) {
                  nodes {
                    name
                    email
                  }
                }
              }
            }
          }
        }
      }
    }
  }`

  const raw = execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`], {
    encoding: 'utf8'
  })

  return JSON.parse(raw).data.search.nodes
}

export function buildGitHubPrMetadata(prs) {
  return prs.map((pr) => {
    const counts = new Map()

    for (const node of pr.commits.nodes || []) {
      for (const author of node.commit.authors.nodes || []) {
        if (!author.name || !author.email) continue
        const key = `${author.name}\t${author.email}`
        counts.set(key, (counts.get(key) || 0) + 1)
      }
    }

    const [winner] = counts.size
      ? [...counts.entries()].sort((left, right) => right[1] - left[1])[0]
      : ['unknown\tunknown']
    const [dominantAuthorName, dominantAuthorEmail] = winner.split('\t')

    const reviewCommentCount = (pr.reviews.nodes || []).reduce(
      (sum, review) =>
        review.author && review.author.__typename === 'User'
          ? sum + (review.comments?.totalCount || 0)
          : sum,
      0
    )

    return {
      number: pr.number,
      title: pr.title,
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
      conversationCommentCount: pr.comments.totalCount,
      reviewCommentCount,
      dominantAuthorName,
      dominantAuthorEmail
    }
  })
}

export function writeGitHubPrMetadataFile({ outputPath, metadata, repoRoot = process.cwd() }) {
  const resolvedPath = path.resolve(repoRoot, outputPath)
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })
  fs.writeFileSync(resolvedPath, JSON.stringify(metadata, null, 2), 'utf8')
  return resolvedPath
}
