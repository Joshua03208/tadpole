import tadpole from "@tadpole/config/eslint";

export default [
  ...tadpole,
  {
    ignores: ["next-env.d.ts", ".next/**"],
  },
];
