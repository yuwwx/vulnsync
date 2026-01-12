"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  SettingsService,
  Product,
  DefectDojoJiraMapping,
  DependencyTrackMapping,
} from "@/services/settings.service";
import { VulnerabilitiesService } from "@/services/vulnerabilities.service";

export default function IntegrationsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    "defectDojoJira" | "dependencyTrack"
  >("defectDojoJira");

  const [defectDojoMapping, setDefectDojoMapping] =
    useState<DefectDojoJiraMapping | null>(null);
  const [dependencyTrackMapping, setDependencyTrackMapping] =
    useState<DependencyTrackMapping | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Загружаем список продуктов
  useEffect(() => {
    VulnerabilitiesService.getProducts().then(setProducts).catch(console.error);
  }, []);

  // Загружаем данные интеграций для выбранного продукта
  useEffect(() => {
    if (!selectedProduct) return;
    setLoading(true);
    Promise.all([
      SettingsService.getDefectDojoMapping(selectedProduct),
      SettingsService.getDependencyTrackMapping(selectedProduct),
    ])
      .then(([dd, dt]) => {
        setDefectDojoMapping(
          dd ?? {
            productType: selectedProduct,
            projectKey: "",
            issueType: "",
            customFields: {},
          }
        );
        setDependencyTrackMapping(
          dt ?? { productId: selectedProduct, dtProject: "", ddProduct: "" }
        );
      })
      .finally(() => setLoading(false));
  }, [selectedProduct]);

  const saveDefectDojo = async () => {
    if (!defectDojoMapping) return;
    setSaving(true);
    try {
      const saved = await SettingsService.saveDefectDojoMapping(
        defectDojoMapping
      );
      setDefectDojoMapping(saved);
    } finally {
      setSaving(false);
    }
  };

  const saveDependencyTrack = async () => {
    if (!dependencyTrackMapping) return;
    setSaving(true);
    try {
      const saved = await SettingsService.saveDependencyTrackMapping(
        dependencyTrackMapping
      );
      setDependencyTrackMapping(saved);
    } finally {
      setSaving(false);
    }
  };

  if (!selectedProduct) {
    return (
      <div className="flex gap-6 p-6">
        <ul className="w-48 border rounded-md p-2 space-y-2">
          {products.map((p) => (
            <li
              key={p.id}
              className="p-2 rounded cursor-pointer hover:bg-gray-100"
              onClick={() => setSelectedProduct(p.id)}
            >
              {p.name}
            </li>
          ))}
        </ul>
        <div className="flex-1 text-gray-500 flex items-center justify-center">
          Select a product to configure integrations
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 p-6">
      {/* Сайдбар */}
      <ul className="w-48 border rounded-md p-2 space-y-2">
        {products.map((p) => (
          <li
            key={p.id}
            className={`p-2 rounded cursor-pointer ${
              selectedProduct === p.id
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => setSelectedProduct(p.id)}
          >
            {p.name}
          </li>
        ))}
      </ul>

      {/* Основной контент с вкладками */}
      <div className="flex-1">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
        >
          <TabsList>
            <TabsTrigger value="defectDojoJira">DefectDojo → Jira</TabsTrigger>
            <TabsTrigger value="dependencyTrack">
              DependencyTrack → DefectDojo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="defectDojoJira">
            {loading ? (
              <div>Loading…</div>
            ) : defectDojoMapping ? (
              <div className="space-y-2 max-w-xl">
                <h2 className="text-lg font-semibold">
                  DefectDojo → Jira Mapping
                </h2>

                <div>
                  <label>Project Key</label>
                  <Input
                    value={defectDojoMapping.projectKey}
                    onChange={(e) =>
                      setDefectDojoMapping({
                        ...defectDojoMapping,
                        projectKey: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label>Issue Type</label>
                  <Input
                    value={defectDojoMapping.issueType}
                    onChange={(e) =>
                      setDefectDojoMapping({
                        ...defectDojoMapping,
                        issueType: e.target.value,
                      })
                    }
                  />
                </div>

                {Object.entries(defectDojoMapping.customFields).map(
                  ([key, value]) => (
                    <div key={key}>
                      <label>{key}</label>
                      <Input
                        value={value}
                        onChange={(e) =>
                          setDefectDojoMapping({
                            ...defectDojoMapping,
                            customFields: {
                              ...defectDojoMapping.customFields,
                              [key]: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  )
                )}

                <Button onClick={saveDefectDojo} disabled={saving}>
                  {saving ? "Saving…" : "Save Mapping"}
                </Button>
              </div>
            ) : (
              <div>No mapping data</div>
            )}
          </TabsContent>

          <TabsContent value="dependencyTrack">
            {loading ? (
              <div>Loading…</div>
            ) : dependencyTrackMapping ? (
              <div className="space-y-2 max-w-xl">
                <h2 className="text-lg font-semibold">
                  Dependency-Track → DefectDojo
                </h2>

                <div>
                  <label>Dependency-Track Project</label>
                  <Input
                    value={dependencyTrackMapping.dtProject}
                    onChange={(e) =>
                      setDependencyTrackMapping({
                        ...dependencyTrackMapping,
                        dtProject: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label>DefectDojo Product</label>
                  <Input
                    value={dependencyTrackMapping.ddProduct}
                    onChange={(e) =>
                      setDependencyTrackMapping({
                        ...dependencyTrackMapping,
                        ddProduct: e.target.value,
                      })
                    }
                  />
                </div>

                <Button onClick={saveDependencyTrack} disabled={saving}>
                  {saving ? "Saving…" : "Save Mapping"}
                </Button>
              </div>
            ) : (
              <div>No mapping data</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
