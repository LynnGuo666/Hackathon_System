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
    <section className="grid gap-5">
      <div>
        <p className="text-sm text-foreground/60">赛事地点</p>
        <h2 className="text-2xl font-semibold">地点与地图</h2>
      </div>

      {loading && <Spinner label="加载地点信息" />}

      {!loading && !location?.name && (
        <Card className="rounded-md">
          <CardBody className="text-sm text-foreground/60">
            暂未配置赛事地点，请等待主办方更新。
          </CardBody>
        </Card>
      )}

      {location?.name && (
        <>
          <Card className="rounded-md">
            <CardHeader className="justify-between gap-4">
              <div>
                <p className="text-sm text-foreground/60">venue</p>
                <h3 className="font-semibold">{location.name}</h3>
              </div>
              <MapPin size={20} className="text-foreground/50" />
            </CardHeader>
            <CardBody className="grid gap-3">
              <p className="text-sm text-foreground/70">{location.address}</p>
              {hasCoordinates && (
                <>
                  <p className="text-sm text-foreground/50">
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
                        startContent={<ExternalLink size={16} />}
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
                      startContent={<Navigation size={16} />}
                    >
                      路线
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {hasCoordinates && mapUrl && (
            <div className="overflow-hidden rounded-md border border-divider bg-content1">
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
