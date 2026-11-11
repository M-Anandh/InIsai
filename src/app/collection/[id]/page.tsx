"use client";

import React from "react";
import { useParams } from "next/navigation";
import { PlaylistDetailView } from "@/components/music/PlaylistDetailView";

export default function CollectionPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? decodeURIComponent(params.id) : "";

  return <PlaylistDetailView id={id} type="collection" />;
}
