'use babel';

import {getTags, getBranches, getRefs} from './getters/git';
import {getNames, getVersions} from './getters/rubygems';
import {getPaths} from './getters/paths';


export default {
  selector: '.source.ruby',
  getSuggestions({editor, bufferPosition}) {
    if (editor.getTitle() != "Gemfile")
      return null;

    let {gemStr, cursorIndex} = extractGem({editor, bufferPosition});
    if (!gemStr)
      return null;

    let tokens = tokenizer(gemStr, cursorIndex);
    let gem = buildGem(tokens);
    switch (gem.editingNow) {
      case 'methodOption':
        return getMethodOptions(gem);
      case 'name':
        return getNames(gem);
      case 'version':
        return getVersions(gem);
      case 'path':
        return getPaths(gem);
      // below are git options
      case 'tag':
        return getTags(gem);
      case 'branch':
        return getBranches(gem);
      case 'ref':
        return getRefs(gem);
      default:
        return null;
    }
  }
};

const METHOD_OPTIONS = ['git'];
function getMethodOptions(gem) {
  return METHOD_OPTIONS.map(o => ({text: o}));
}

function extractGem({editor, bufferPosition}) {
  let partialGemfile = editor.getTextInBufferRange([[0,0], bufferPosition]);
  let gemIndex = partialGemfile.lastIndexOf('gem ');
  if (gemIndex == -1)
    return null;
  let gemStr = partialGemfile.substring(gemIndex);
  let cursorIndex = gemStr.length - 1;
  let row = bufferPosition.row;
  let next = editor.getTextInBufferRange([bufferPosition, [row, Infinity]]);
  while (next) {
    gemStr += next;
    next = editor.lineTextForBufferRow(++row);
  }
  return {gemStr, cursorIndex}; // added second half of gem
}

const LETTERS = /[a-z_]/i;
const WHITESPACE = /[\s]/;
const QUOTE = /['"]/;
function tokenizer(input, cursorIndex) {
  let current = 0;
  let tokens = [];

  while (current < input.length) {
    let char = input[current];
    let editingNow = false;

    let LETTERS = /[a-z_]/i;
    if (LETTERS.test(char)) {
      let value = '';

      while (char && LETTERS.test(char)) {
        if (current === cursorIndex)
          editingNow = true;
        value += char;
        char = input[++current];
      }

      let endChar = input[current++];
      let type;

      if (WHITESPACE.test(endChar))
        type = 'method';
      else if (endChar === ':')
        type = 'symbol';

      if (type)
        tokens.push({type, value, editingNow});

      continue;
    }

    if (QUOTE.test(char)) {
      let value = '';
      let openingQuote = char;
      if (current === cursorIndex)
        editingNow = true;
      char = input[++current];
      while (char && (char != openingQuote)) {
          if (current === cursorIndex)
            editingNow = true;
          value += char;
          char = input[++current];
      }

      tokens.push({
        type: "string",
        value, editingNow
      });
      current++;
      continue;
    }

    if (char === ',') {
      tokens.push({
        type: 'comma'
      });
      current++;
      continue;
    }

    if (char === '=') {
      if (input[++current] === '>') {
        tokens.push({type: 'arrow'});
        current++;
      }
      continue;
    }

    current++;
    continue;
  }

  return tokens;
}

function buildGem(tokens) {
  let gem = {};
  let i = 0;
  while (i < tokens.length) {
    let token = tokens[i];
    switch (token.type) {
      case "method":
        if (token.value === "gem") {
          let gemName = tokens[++i];
          if (gemName && gemName.type === 'string') {
            gem.name = gemName.value;
            if (gemName.editingNow)
              gem.editingNow = 'name';
          }
        }
        i++;
        break;
      case "string":
        if (tokens[i-1].type === 'comma' && i < 4) {
          gem.version = token.value;
          if (token.editingNow)
            gem.editingNow = 'version';
        }
        i++;
        break;
      case "symbol":
        if (token.editingNow)
          gem.editingNow = 'methodOption';
        let optionValue = tokens[++i];
        if (optionValue && optionValue.type === "string") {
          if (optionValue.editingNow)
            gem.editingNow = token.value;
          gem[token.value] = optionValue.value;
          i++;
        }
        break;
      default:
        i++;
    }
  }
  return gem;
}
