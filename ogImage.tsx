import type { SocialImageOptions } from "@quartz-community/og-image"
import { displayPeriod, type PortfolioFrontmatter } from "./site-plugins/portfolio/src/dates"

function fontName(spec: string | { name: string } | undefined): string {
  if (!spec) return "sans-serif"
  return typeof spec === "string" ? spec : spec.name
}

/**
 * Default Quartz OG layout, but the date line uses portfolio period labels
 * (award/hackathon month-year, project start – end) instead of a full calendar day.
 */
export const portfolioOgImage: SocialImageOptions["imageStructure"] = ({
  cfg,
  userOpts,
  title,
  description,
  fileData,
  iconBase64,
}) => {
  const { colorScheme } = userOpts
  const theme = cfg.theme
  const colors = theme.colors[colorScheme]
  const fontBreakPoint = 32
  const useSmallerFont = title.length > fontBreakPoint
  const fm = (fileData.frontmatter ?? {}) as PortfolioFrontmatter
  const date = displayPeriod(fm) || null
  const tags = (fileData.frontmatter?.tags ?? []) as string[]
  const bodyFont = fontName(theme.typography.body)
  const headerFont = fontName(theme.typography.header)

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: colors.light,
        padding: "2.5rem",
        fontFamily: bodyFont,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "0.5rem",
        }}
      >
        {iconBase64 && (
          <img
            src={iconBase64}
            alt=""
            width={56}
            height={56}
            style={{ borderRadius: "50%" }}
          />
        )}
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: colors.gray,
            fontFamily: bodyFont,
          }}
        >
          {cfg.baseUrl}
        </div>
      </div>

      <div style={{ display: "flex", marginTop: "1rem", marginBottom: "1.5rem" }}>
        <h1
          style={{
            margin: 0,
            fontSize: useSmallerFont ? 64 : 72,
            fontFamily: headerFont,
            fontWeight: 700,
            color: colors.dark,
            lineHeight: 1.2,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </h1>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          fontSize: 36,
          color: colors.darkgray,
          lineHeight: 1.4,
        }}
      >
        <p
          style={{
            margin: 0,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 5,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {description}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "2rem",
          paddingTop: "2rem",
          borderTop: `1px solid ${colors.lightgray}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            color: colors.gray,
            fontSize: 28,
          }}
        >
          {date && <div style={{ display: "flex" }}>{date}</div>}
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {tags.slice(0, 3).map((tag) => (
            <div
              key={tag}
              style={{
                display: "flex",
                padding: "0.35rem 0.85rem",
                borderRadius: "999px",
                backgroundColor: colors.highlight,
                color: colors.secondary,
                fontSize: 22,
                fontFamily: bodyFont,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
