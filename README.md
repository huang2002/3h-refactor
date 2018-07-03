# 3h-refactor

A refactor lib.

# Functionality

- Find the reference(s) to the src file.
- Automatically change the import/export statement(s) while moving the src file.

# Support info

Here is some support info. Please note that this is the default support info, and you can customize the patterns by modifying the regular expression arrays.

## Statements

The lib supports most common import/export statements out of the box.

- `import { ... } from "...";`
- `import * from "...";`
- `import * as ___ from "...";`
- `export { ... } from "...";`
- `export * from "...";`
- `import ___ = require("...");`
- `require("...")`

## File formats

Files with following extensions are included by default.

- `js`
- `jsx`
- `mjs`
- `ts`
- `tsx`

# Usage

## In your command line

```
Usage:
  3h-refactor              - Show help info like this.
  3h-refactor <src>        - Show reference(s) to src file.
  3h-refactor <src> <dist> - Change src file to dist file.
```

## In your app

Just read the declaration files in [`typings`](typings) to learn the APIs.
