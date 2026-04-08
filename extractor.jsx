// extractor.jsx — Layer 1: HTML → DesignDescriptor

function extractDesignDescriptor(html) {
  return new Promise((resolve) => {
    // Create hidden iframe to render the HTML
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:absolute;left:-9999px;width:1280px;height:800px;border:none;";
    document.body.appendChild(iframe);

    iframe.onload = () => {
      const doc = iframe.contentDocument;
      const elements = [];
      const colorSet = {};

      function walk(node, depth) {
        if (node.nodeType !== 1) return;
        const tag = node.tagName.toLowerCase();
        const style = iframe.contentWindow.getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const cat = classifySonarElement(tag);

        // Font metrics
        const fontSize = parseFloat(style.fontSize) || 0;
        const fontWeight = parseInt(style.fontWeight) || 400;

        // Colors
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        if (color && color !== "rgba(0, 0, 0, 0)") {
          colorSet[color] = (colorSet[color] || 0) + 1;
        }
        if (backgroundColor && backgroundColor !== "rgba(0, 0, 0, 0)") {
          colorSet[backgroundColor] = (colorSet[backgroundColor] || 0) + 1;
        }

        // Spacing
        const marginTop = parseFloat(style.marginTop) || 0;
        const marginBottom = parseFloat(style.marginBottom) || 0;
        const marginLeft = parseFloat(style.marginLeft) || 0;
        const marginRight = parseFloat(style.marginRight) || 0;
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const paddingBottom = parseFloat(style.paddingBottom) || 0;
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingRight = parseFloat(style.paddingRight) || 0;
        const totalSpacing = marginTop + marginBottom + marginLeft + marginRight
          + paddingTop + paddingBottom + paddingLeft + paddingRight;
        const elementSize = Math.max(rect.width + rect.height, 1);
        const whitespaceRatio = totalSpacing / elementSize;

        // Layout
        const display = style.display;
        const gridCols = style.gridTemplateColumns;
        const gridColumns = (display === "grid" && gridCols && gridCols !== "none")
          ? gridCols.split(/\s+/).length
          : 0;
        const flexDirection = display === "flex" ? style.flexDirection : null;

        // Heading detection
        const headingMatch = tag.match(/^h([1-6])$/);
        const isHeading = !!headingMatch;
        const headingLevel = headingMatch ? parseInt(headingMatch[1]) : null;

        // Visual weight: larger font + bolder + larger area = more weight
        const area = rect.width * rect.height;
        const visualWeight = (fontSize / 16) * (fontWeight / 400) * Math.min(area / 10000, 2);

        // Sibling info
        const sibIndex = node.parentElement
          ? Array.from(node.parentElement.children).indexOf(node)
          : 0;
        const childCount = node.children.length;

        // Repeated structure detection (do siblings share the same tag sequence?)
        let repeatedChildStructure = false;
        let repeatCount = 0;
        if (childCount >= 2) {
          const childTags = Array.from(node.children).map(c =>
            Array.from(c.children).map(gc => gc.tagName).join(",") + ":" + c.tagName
          );
          const firstPattern = childTags[0];
          const matches = childTags.filter(t => t === firstPattern).length;
          if (matches === childTags.length && matches >= 2) {
            repeatedChildStructure = true;
            repeatCount = matches;
          }
        }

        elements.push({
          tag, cat, depth, sibIndex, childCount,
          fontSize, fontWeight, color, backgroundColor,
          width: rect.width, height: rect.height,
          whitespaceRatio,
          display, gridColumns, flexDirection,
          isHeading, headingLevel, visualWeight,
          repeatedChildStructure, repeatCount,
        });

        for (const child of node.children) {
          walk(child, depth + 1);
        }
      }

      walk(doc.documentElement, 0);

      // Build color palette sorted by usage
      const colorPalette = Object.entries(colorSet)
        .map(([hex, count]) => ({ hex, count }))
        .sort((a, b) => b.count - a.count);

      const viewportArea = 1280 * 800;

      document.body.removeChild(iframe);

      resolve({
        elements,
        colorPalette,
        totalElements: elements.length,
        viewportArea,
        density: elements.length / (viewportArea / 10000),
      });
    };

    iframe.srcdoc = html;
  });
}

// Shared element classifier (same categories as prototype)
function classifySonarElement(tagName) {
  const t = (tagName || "").toLowerCase();
  if (["html","body","div","section","main","article","aside","header","footer","nav","ul","ol","dl","table","thead","tbody","tr","td","th"].includes(t)) return "structural";
  if (["p","span","h1","h2","h3","h4","h5","h6","a","em","strong","b","i","li","label","blockquote","pre","code","small","sub","sup","abbr","cite","dd","dt","figcaption","mark","s","u","time","data"].includes(t)) return "text";
  if (["img","video","audio","canvas","svg","picture","figure","source","track","embed","object","iframe"].includes(t)) return "media";
  if (["button","input","select","textarea","form","details","summary","dialog","fieldset","legend","meter","output","progress","datalist","option","optgroup"].includes(t)) return "interactive";
  return "meta";
}
