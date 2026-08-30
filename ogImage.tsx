import type { SocialImageOptions } from "@quartz-community/og-image"
import { displayPeriod, type PortfolioFrontmatter } from "./site-plugins/portfolio/src/dates"

function fontName(spec: string | { name: string } | undefined): string {
  if (!spec) return "sans-serif"
  return typeof spec === "string" ? spec : spec.name
}

/**
 * Quartz OG layout with portfolio date labels.
 * When a ## Gallery cover exists, it becomes a blurred + darkened full-bleed background.
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
  const words = (fileData.text ?? "").trim().split(/\s+/).filter(Boolean).length
  // Match reading-time's default (~200 wpm), same as Quartz's stock OG template.
  const minutes = Math.max(1, Math.ceil(words / 200))
  // Ignore plugin default ("X min read") — clock icon already conveys reading time.
  const readingTimeText = `${minutes} min`
  const tags = (fileData.frontmatter?.tags ?? []) as string[]
  const bodyFont = fontName(theme.typography.body)
  const headerFont = fontName(theme.typography.header)
  const coverBase64 =
    typeof (fileData as { ogCoverBase64?: unknown }).ogCoverBase64 === "string"
      ? (fileData as { ogCoverBase64: string }).ogCoverBase64
      : null

  const onCover = Boolean(coverBase64)
  const titleColor = onCover ? "#f4f7fa" : colors.dark
  const bodyColor = onCover ? "rgba(231, 237, 243, 0.88)" : colors.darkgray
  const metaColor = onCover ? "rgba(199, 209, 218, 0.9)" : colors.gray
  const ruleColor = onCover ? "rgba(231, 237, 243, 0.22)" : colors.lightgray
  const chipBg = onCover ? "rgba(11, 17, 24, 0.55)" : colors.highlight
  const chipFg = onCover ? "#f0bc86" : colors.secondary

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: colors.light,
        fontFamily: bodyFont,
      }}
    >
      {coverBase64 && (
        <img
          src={coverBase64}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            objectFit: "cover",
          }}
        />
      )}
      {coverBase64 && (
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(8, 12, 18, 0.58)",
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          position: "relative",
          flexDirection: "column",
          flex: 1,
          height: "100%",
          width: "100%",
          padding: "2.5rem",
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
              color: metaColor,
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
              color: titleColor,
              lineHeight: 1.15,
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
            color: bodyColor,
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
            borderTop: `1px solid ${ruleColor}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: metaColor,
              fontSize: 28,
              minWidth: "28%",
            }}
          >
            {date && <div style={{ display: "flex" }}>{date}</div>}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: metaColor,
              fontSize: 28,
            }}
          >
            <svg
              style={{ marginRight: "0.5rem" }}
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {readingTimeText}
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              minWidth: "28%",
            }}
          >
            {tags.slice(0, 3).map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  padding: "0.35rem 0.85rem",
                  borderRadius: "999px",
                  backgroundColor: chipBg,
                  color: chipFg,
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
    </div>
  )
}
