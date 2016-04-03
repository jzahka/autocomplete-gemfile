"use babel";

// TODO: make these aysnc
import {readdirSync, readFileSync, statSync, getHomeDirectory} from 'fs-plus';

let gemIndex;
atom.workspace.observeActivePaneItem(item => {
  if (item && item.getTitle() == "Gemfile" && !gemIndex)
    gemIndex = directoriesByGemName();
});

export default {
  getPaths({name}) {
    return gemIndex
      .then(index => index[name] || [])
      .then(dirList => dirList.map(({path}) => ({text: path})));
  }
};

function directoriesByGemName(rootDir = getHomeDirectory()) {
  return new Promise((resolve, reject) => {
    resolve(indexGemDirectories(rootDir, 0));
  });
}
const MAX_DEPTH = 2; // levels of recursion
function indexGemDirectories(dir, depth) {
  if (depth > MAX_DEPTH - 1)
    return {};
  files = readdirSync(dir);
  return files.reduce((acc, file) => {
    let fullPath = `${dir}/${file}`;
    let isDirectory;
    // TODO: catch errors in a non-stupid way
    try {
      isDirectory = statSync(fullPath).isDirectory();
    } catch(e) {
      // skip
      return acc;
    }
    if (isDirectory && getGemspec(fullPath)) {
      mergeGemIndicies(acc, {[getGemName(fullPath)]: [{path: fullPath}]});
    } else if (isDirectory && !file.startsWith('.')) {
      mergeGemIndicies(acc, indexGemDirectories(fullPath, depth + 1));
    }
    return acc;
  }, {});
}

function getGemspec(dir) {
  return readdirSync(dir).find(file => file.endsWith('.gemspec'));
}

function getGemName(dir) {
  let gemspecPath = `${dir}/${getGemspec(dir)}`;
  let gemspec = readFileSync(gemspecPath);
  // TODO:  make this regex better
  // TODO: handle failure, yo
  [_, gemName] = /name\s*=\s*['"](.*?)['"]/.exec(gemspec);
  return gemName;
}

function mergeGemIndicies(target, source) {
  for (let key in source) {
    if (target[key]) {
      target[key] = target[key].concat(source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
