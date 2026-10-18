import { componentRegistry } from "./quartz/components/registry"
import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { portfolioOgImage } from "./ogImage"
import { PortfolioNewsletter } from "./site-plugins/portfolio/dist/index.js"

// Must run before loadQuartzConfig so CustomOgImages picks up the override.
componentRegistry.setOptionOverrides("@quartz-community/og-image", {
  imageStructure: portfolioOgImage,
})

const config = await loadQuartzConfig()
// The package loader selects one emitter from a multi-export plugin. Register
// this additional site emitter explicitly alongside the Markdown emitter.
config.plugins.emitters.push(PortfolioNewsletter())
export default config
export const layout = await loadQuartzLayout()
