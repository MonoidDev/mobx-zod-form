import { asyncLocalStorage } from "@monoid-dev/mobx-zod-form";

export const HydrateMobxZodForm = () => {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: getHydrateScript(),
      }}
      suppressHydrationWarning
    />
  );
};

export const getHydrateScript = () => {
  return `
    window.__MOBX_ZOD_FORM_SERVER_LOCAL_STORAGE__ = window.__MOBX_ZOD_FORM_SERVER_LOCAL_STORAGE__ || ${JSON.stringify(
      asyncLocalStorage?.getStore(),
    )};
  `;
};
