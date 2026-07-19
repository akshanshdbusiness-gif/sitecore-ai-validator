// Fixture: clean SSG configuration, no force-dynamic, static-paths errors
// are rethrown rather than swallowed. Should pass the audit cleanly.
/* eslint-disable @typescript-eslint/no-unused-vars */
const client = {
  getAppRouterStaticParams: async (sites: string[], locales: string[]) =>
    [] as { params: { path: string[] } }[],
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default async function Page() {
  return null;
}

export const generateStaticParams = async () => {
  try {
    return await client.getAppRouterStaticParams(['default'], ['en']);
  } catch (error) {
    throw error;
  }
};
