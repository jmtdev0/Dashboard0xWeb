const EXCLUDED_CHROME_EXTENSION_IDS = new Set([
  "afgabihhekgggkhcdccbmmnjihlhmhbl",
  "fdnoeedebfddngeggchilhfjbnnipadj",
]);

const EXCLUDED_CHROME_EXTENSION_NAMES = new Set([
  "you tube first playlist video",
  "youtube first playlist video",
  "twitch hide followed channel",
]);

const EXCLUDED_CHROME_EXTENSION_REPOS = new Set([
  "youtubefirstplaylistvideo",
  "twitchhidefollowedchannel",
]);

type ChromeExtensionLike = {
  extensionId?: string;
  name?: string;
  repo?: string;
};

export function isExcludedChromeExtension(extension: ChromeExtensionLike) {
  const extensionId = extension.extensionId?.trim().toLowerCase();
  const name = extension.name?.trim().toLowerCase();
  const repo = extension.repo?.trim().toLowerCase();

  return Boolean(
    (extensionId && EXCLUDED_CHROME_EXTENSION_IDS.has(extensionId)) ||
      (name && EXCLUDED_CHROME_EXTENSION_NAMES.has(name)) ||
      (repo && EXCLUDED_CHROME_EXTENSION_REPOS.has(repo))
  );
}

export function filterChromeExtensions<T extends ChromeExtensionLike>(
  extensions: T[]
) {
  return extensions.filter((extension) => !isExcludedChromeExtension(extension));
}
