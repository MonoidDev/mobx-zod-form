import { useConfig } from "nextra-theme-docs";

import { LogoSvg } from "./src/components/LogoSvg";
import packageJson from "../mobx-zod-form/package.json";

const siteName = "Mobx Zod Form";
const description = `Data-first form builder based on MobX & Zod`;

export default {
  logo: (
    <>
      <LogoSvg />
      <strong style={{ marginLeft: "1em" }}>Mobx Zod Form</strong>
    </>
  ),
  head: function useHead() {
    const { title } = useConfig();

    return (
      <>
        <meta name="msapplication-TileColor" content="#4097E7" />
        <meta name="theme-color" content="#4097E7" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Language" content="en" />
        <meta name="description" content={description} />
        <meta name="og:description" content={description} />
        <meta
          name="og:title"
          content={title ? title + " - " + siteName : siteName}
        />
        <meta name="apple-mobile-web-app-title" content={siteName} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </>
    );
  },
  primaryHue: 202,
  useNextSeoProps() {
    return {
      titleTemplate: `%s - ${siteName}`,
    };
  },
  project: {
    link: packageJson.repository.url,
  },
  docsRepositoryBase:
    packageJson.repository.url + "/blob/master/packages/website",
  // ...
};
