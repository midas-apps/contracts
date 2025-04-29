import { writeFile } from 'fs/promises';

import { getAllRoles } from '../helpers/roles';

const formatKey = (k: string) => {
  return `***${k}***`;
};

const formatValue = (v: string) => {
  return `\`${v}\``;
};

const func = async () => {
  const { common, tokenRoles } = getAllRoles();

  const mdHeaders = ['MToken', ...Object.keys(tokenRoles.mTBILL)];
  const mdRows = Object.entries(tokenRoles).map(([mToken, roles]) => [
    formatKey(mToken),
    ...Object.values(roles).map(formatValue),
  ]);

  const tokensTable = [mdHeaders, mdHeaders.map((_) => '---'), ...mdRows]
    .map((row) => '| ' + row.join(' | ') + ' |')
    .join('\n');

  const commonHeaders = ['Role Name', 'Role'];
  const commonTable = [
    commonHeaders,
    commonHeaders.map((_) => '---'),
    ...Object.entries(common).map(([key, value]) => [
      formatKey(key),
      formatValue(value),
    ]),
  ]
    .map((row) => '| ' + row.join(' | ') + ' |')
    .join('\n');

  const content = `
*Note: this file is auto-generated*

# Roles

All the roles for the Midas protocol smart contracts are listed below.

## Common Roles

${commonTable}


## Token Roles

${tokensTable}
`;

  await writeFile('ROLES.md', content, {
    encoding: 'utf-8',
    flag: 'w',
  });
};

func().then(console.log).catch(console.error);
