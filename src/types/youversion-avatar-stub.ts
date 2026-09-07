// Stub module. @youversion/platform-react-ui's shipped .d.ts files contain an
// unresolved internal path alias ("@/components/ui/avatar") that, without this
// override, resolves into this project's own "@/*" alias and collides with our
// unrelated src/components/ui/Avatar.tsx on case-insensitive filesystems
// (TS1149). This dedicated stub gives that exact specifier somewhere real to
// resolve to instead, so it never touches our own Avatar component.
export {};
