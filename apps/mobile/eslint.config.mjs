import tadpole from "@tadpole/config/eslint";

export default [
  ...tadpole,
  {
    ignores: [".expo/**", "expo-env.d.ts", "nativewind-env.d.ts"],
  },
];
