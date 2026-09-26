/**
 * Studio branding shown around every artwork. Change these values (and `components/BrandMark.tsx`
 * plus the colour tokens in `app/globals.css`) to rebrand the viewer.
 */
export const BRAND = {
  /** Product name of this viewer. */
  product: 'Loupe',
  /** How the product is credited everywhere: "Loupe by Siam Parvez". */
  productCredit: 'Loupe by Siam Parvez',
  name: 'Siam Parvez',
  siteUrl: 'https://siamparvez.com',
  siteLabel: 'siamparvez.com',
  email: 'hello@siamparvez.com',
  /** Browser UI / theme colour (matches `--color-stage`). */
  themeColor: '#000000',
} as const;
