# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

It is preconfigured to work with Power Apps Code Apps.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Per-field audit history

The app writes one `crcf4_cdbfieldchangehistory` Dataverse row per changed contact
field. Before enabling the feature in an environment, create the
**CDB Field Change History** table with these logical columns (using the
environment's `crcf4` publisher prefix):

| Logical name | Type | Purpose |
| --- | --- | --- |
| `crcf4_fieldname` | Text (primary name) | Changed column's logical name |
| `crcf4_contactrecordid` | Text | Contact row ID (`crcf4_cdb_datamodelid`) |
| `crcf4_changedbyname` | Text | Person who made the change |
| `crcf4_changedbyemail` | Text | Person's email |
| `crcf4_fieldlabel` | Text | Display label for the changed column |
| `crcf4_beforevalue` | Multiple lines of text | Value before the change |
| `crcf4_aftervalue` | Multiple lines of text | Value after the change |
| `crcf4_changedon` | Date and time (time-zone independent) | UTC change time |

Add the table to the Code App Dataverse data sources with
`pa app add data-source --connector dataverse --table crcf4_cdbfieldchangehistory`
and regenerate the app's data-source metadata before publishing. The profile
shows the timeline only to Data Stewards and Directory Administrators. Grant
Create (organization scope) to roles that can make app changes, and grant Read
(organization scope) only to those two privileged roles; do not grant Update
or Delete. The history includes personal data, so use the same environment
governance and retention controls as the contact table.

This app records changes made through its Edit Contact, Contribute, and Mark
reviewed flows. The contact's "Last updated on" value is updated as part of
these operations but is not stored as a separate field-history entry. It is not
a tamper-proof replacement for Dataverse auditing:
changes made outside the app are not captured by this client-side history.
Enable native Dataverse auditing or a server-side plug-in if the record must be
authoritative or complete.

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
