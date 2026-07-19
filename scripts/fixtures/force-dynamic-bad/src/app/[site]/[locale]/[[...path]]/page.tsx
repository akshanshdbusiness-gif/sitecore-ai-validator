// Fixture: force-dynamic alongside generateStaticParams — the exact
// contradiction that was, until recently, present in this repo's own
// kit-nextjs-product-listing starter. Kept here as a stable regression
// fixture since upstream can (and did) fix it out from under a live test.
export const dynamic = 'force-dynamic';

export default async function Page() {
  return null;
}

export const generateStaticParams = async () => {
  return [];
};
