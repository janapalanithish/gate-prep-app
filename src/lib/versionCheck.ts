/**
 * GitHub Release Version Checker
 * Fetches the latest release from GitHub API and compares with current app version.
 * Shows an in-app update banner when a newer version is available.
 */

export interface GitHubRelease {
  tag_name: string;        // e.g. "v1.0.17"
  name: string;            // Release title
  html_url: string;        // Release page URL
  assets: { name: string; browser_download_url: string }[];
}

export interface VersionCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  release: GitHubRelease | null;
  downloadUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Compare two semantic version strings (e.g., "1.0.17" vs "1.0.14").
 * Returns positive if v1 > v2, negative if v1 < v2, 0 if equal.
 */
export function compareVersions(v1: string, v2: string): number {
  // Strip 'v' prefix if present
  const normalize = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const a = normalize(v1);
  const b = normalize(v2);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const n1 = a[i] ?? 0;
    const n2 = b[i] ?? 0;
    if (n1 !== n2) return n1 - n2;
  }
  return 0;
}

/**
 * Get the current app version from package.json or hardcoded constant.
 * Update this whenever releasing a new version.
 */
export const CURRENT_APP_VERSION = '1.0.19';
const GITHUB_API_URL = 'https://api.github.com/repos/janapalanithish/gate-prep-app/releases/latest';

/**
 * Check for updates by fetching the latest GitHub release.
 * Returns the full result object with update status.
 */
export async function checkForUpdates(): Promise<VersionCheckResult> {
  const result: VersionCheckResult = {
    hasUpdate: false,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
    release: null,
    downloadUrl: null,
    isLoading: true,
    error: null,
  };

  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      // GitHub API rate limit or network error — treat as non-fatal
      result.error = `API returned ${response.status}`;
      result.isLoading = false;
      return result;
    }

    const release: GitHubRelease = await response.json();
    const latestTag = release.tag_name || '';
    const latestVersion = latestTag.replace(/^v/, '');

    result.latestVersion = latestVersion;
    result.release = release;
    result.hasUpdate = compareVersions(latestVersion, CURRENT_APP_VERSION) > 0;

    // Find the APK asset
    const apkAsset = release.assets?.find(
      (a) => a.name.endsWith('.apk') || a.name === 'app-debug.apk'
    );
    if (apkAsset) {
      result.downloadUrl = apkAsset.browser_download_url;
    } else if (release.html_url) {
      // Fallback to release page
      result.downloadUrl = release.html_url;
    }

    result.isLoading = false;
    return result;
  } catch (e: any) {
    result.error = e?.message || 'Network error';
    result.isLoading = false;
    return result;
  }
}
