"use client";

import React from "react";
import { CoverImage, CoverImageProps } from "./CoverImage";

export const ArtworkImage: React.FC<CoverImageProps & { size?: string; priority?: boolean }> = (
  props
) => {
  return <CoverImage {...props} />;
};
