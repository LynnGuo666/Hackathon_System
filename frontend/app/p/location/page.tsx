"use client";

import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Spinner } from "@heroui/react";
import { ExternalLink, MapPin, Navigation } from "lucide-react";
import { errorText, notify } from "@/components/toast";
import { api, type EventLocation } from "@/web/lib/api";
import { useEffect, useMemo, useState } from "react";

export default function LocationPage() {
  const [location, setLocation] = useState<EventLocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.eventLocation()
      .then(setLocation)
      .catch((err) => notify.error(errorText(err, "无法读取赛事地点")))
      .finally(() => setLoading(false));
  }, []);

  const mapUrl = useMemo(() => {
    if (location?.latitude === null || location?.longitude === null || !location) {
      return "";
    }
    const lat = location.latitude;
    const lon = location.longitude;
    const bbox = [lon - 0.01, lat - 0.01, lon + 0.01, lat + 0.01].join(",");
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  }, [location]);

  const hasCoordinates = location?.latitude !== null && location?.longitude !== null;

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs font-medium text-foreground/40">赛事地点</p>
        <h2 className="text-xl font-bold text-foreground">地点与地图</h2>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner label="加载地点信息" />
        </div>
      )}

      {!loading && !location?.name && (
        <Card classNames={{ base: "rounded-card shadow-sm" }}>
          <CardBody className="py-8 text-center text-sm text-foreground/40">
            暂未配置赛事地点，请等待主办方更新。
          </CardBody>
        </Card>
      )}

      {location?.name && (
        <>
          <Card classNames={{ base: "rounded-card shadow-sm" }}>
            <CardHeader className="items-start justify-between gap-4 px-5 py-4">
              <div className="grid gap-1">
                <p className="text-xs font-medium text-foreground/40">场地</p>
                <h3 className="text-sm font-semibold text-foreground">{location.name}</h3>
              </div>
              <MapPin size={18} className="shrink-0 text-foreground/30" aria-hidden="true" />
            </CardHeader>
            <CardBody className="grid gap-3 px-5 pb-5">
              <p className="text-sm text-foreground/60">{location.address}</p>
              {hasCoordinates && (
                <>
                  <p className="font-mono text-xs text-foreground/30">
                    {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {location.osmUrl && (
                      <Button
                        as={Link}
                        href={location.osmUrl}
                        target="_blank"
                        rel="noreferrer"
                        variant="flat"
                        size="sm"
                        startContent={<ExternalLink size={14} />}
                      >
                        OpenStreetMap
                      </Button>
                    )}
                    <Button
                      as={Link}
                      href={`https://www.openstreetmap.org/directions?to=${location.latitude},${location.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      color="primary"
                      variant="flat"
                      size="sm"
                      startContent={<Navigation size={14} />}
                    >
                      路线
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {hasCoordinates && mapUrl && (
            <div className="overflow-hidden rounded-card border border-divider bg-content1">
              <iframe
                title="赛事地点地图"
                src={mapUrl}
                className="h-[360px] w-full border-0"
                loading="lazy"
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
