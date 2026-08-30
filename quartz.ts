import { componentRegistry } from "./quartz/components/registry"
import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { portfolioOgImage } from "./ogImage"

// Must run before loadQuartzConfig so CustomOgImages picks up the override.
componentRegistry.setOptionOverrides("@quartz-community/og-image", {
  imageStructure: portfolioOgImage,
})

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
