import os

with open('src/Pages/energy/components/header/ModeIcon.svg', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove SVG outer filters/borders for slot 0
content = content.replace('<g filter="url(#filter0_d_892_4894)">', '')
content = content.replace('</g>\n<rect x="63"', '<rect x="63"')

# Slot 0 dynamic wrapper
content = content.replace(
    '<rect x="1" width="49.2569" height="33.5843" rx="5" fill="#53575A"/>\n<rect x="2.5" y="1.5" width="46.2569" height="30.5843" rx="3.5" stroke="#4FBF65" stroke-width="3"/>',
    '<rect x="1" y="1" width="49.2569" height="33.5843" rx="5" fill="#53575A" stroke={mode === "SMART_NAV" ? "#4FBF65" : "#CBCBCB"} strokeWidth={mode === "SMART_NAV" ? "3" : "2"} />'
)

# Slot 1
content = content.replace(
    '<rect x="63" y="1" width="38.3011" height="31.5843" rx="4" fill="#53575A" stroke="#CBCBCB" stroke-width="2"/>',
    '<rect x="63" y="1" width="38.3011" height="31.5843" rx="4" fill="#53575A" stroke={mode === "HYBRID" ? "#4FBF65" : "#CBCBCB"} strokeWidth={mode === "HYBRID" ? "3" : "2"}/>'
)

# Slot 2
content = content.replace(
    '<rect x="112.257" y="1" width="38.3011" height="31.5843" rx="4" fill="#53575A" stroke="#CBCBCB" stroke-width="2"/>',
    '<rect x="112.257" y="1" width="38.3011" height="31.5843" rx="4" fill="#53575A" stroke={mode === "ECO_MODE" ? "#4FBF65" : "#CBCBCB"} strokeWidth={mode === "ECO_MODE" ? "3" : "2"}/>'
)

# Slot 3
content = content.replace(
    '<rect x="159.275" y="1" width="38.3011" height="31.5843" rx="4" fill="#53575A" stroke="#CBCBCB" stroke-width="2"/>',
    '<rect x="159.275" y="1" width="38.3011" height="31.5843" rx="4" fill="#53575A" stroke={mode === "FULL_SPEED" ? "#4FBF65" : "#CBCBCB"} strokeWidth={mode === "FULL_SPEED" ? "3" : "2"}/>'
)

# Fill color logic for inner icons
content = content.replace('fill="#4FBF65"', 'fill={mode === "SMART_NAV" ? "#4FBF65" : "#CBCBCB"}')

content = content.replace(
    '<rect x="67.0804" y="5.50171" width="27.9553" height="24.2947" fill="#CBCBCB"/>',
    '<rect x="67.0804" y="5.50171" width="27.9553" height="24.2947" fill={mode === "HYBRID" ? "#4FBF65" : "#CBCBCB"}/>'
)

content = content.replace(
    '<rect x="115.853" y="1.84595" width="29.1064" height="29.1064" fill="#CBCBCB"/>',
    '<rect x="115.853" y="1.84595" width="29.1064" height="29.1064" fill={mode === "ECO_MODE" ? "#4FBF65" : "#CBCBCB"}/>'
)

content = content.replace(
    '<rect x="162.535" y="4.29492" width="31.9367" height="20.6997" fill="#CBCBCB"/>',
    '<rect x="162.535" y="4.29492" width="31.9367" height="20.6997" fill={mode === "FULL_SPEED" ? "#4FBF65" : "#CBCBCB"}/>'
)

# Replace SVG hyphens with camelCase
content = content.replace('xmlns:xlink', 'xmlnsXlink')
content = content.replace('xlink:href', 'xlinkHref')
content = content.replace('stroke-width', 'strokeWidth')
content = content.replace('color-interpolation-filters', 'colorInterpolationFilters')
content = content.replace('mask-type', 'maskType')
content = content.replace('style="maskType:alpha"', 'style={{maskType:"alpha"}}')

# And handle the root node
content = content.replace('<?xml version="1.0" encoding="utf-8"?>', '')

out = f"""import React from 'react';

export default function ModeIconDynamic({{ mode }}) {{
  return (
    {content}
  );
}}
"""

with open('src/Pages/energy/components/header/ModeIconDynamic.jsx', 'w', encoding='utf-8') as f:
    f.write(out)
