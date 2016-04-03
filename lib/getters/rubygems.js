"use babel";

import fetch from 'node-fetch';
import {format} from 'url';

const client = {
  searchGems(query) {
    urlObj = client.urlObj({
      query: {query: query},
      pathname: '/search.json'
    });
    return fetch(format(urlObj));
  },
  getGemVersions(gemName) {
    urlObj = client.urlObj({
      pathname: `/versions/${gemName}.json`
    });
    return fetch(format(urlObj));
  },
  urlObj({query, pathname}) {
    return {
      protocol: 'https',
      host: 'rubygems.org',
      pathname: `/api/v1${pathname}`,
      query: query
    };
  }
};

export default {
  getNames({name}) {
    return client.searchGems(name)
      .then(gems => gems.json())
      .then(gems => gems.map(({name}) => ({text: name})));
  },
  getVersions({name, version}) {
    let numberInput = parseVersion(version);
    if (typeof numberInput != "string")
      return null;

    return client.getGemVersions(name)
      .then(versions => versions.json())
      .then(versions => {
        if (!numberInput)
          return versions;
        // filter based on user input
        return versions.filter(({number}) => {
          return number.indexOf(numberInput) != -1;
        });
      })
      .then(versions => {
        return versions.map(({number}) => ({text: number}));
      });
  }
};

function parseVersion(version) {
  match = /^(?:=|!=|>|<|>=|<=|~>)\s*([0-9\.]*?)$/.exec(version);
  if (match) {
    return match[1];
  } else {
    return null;
  }
}
