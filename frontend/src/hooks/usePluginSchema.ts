import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { pluginApi } from "../api/pluginApi";
import type { PluginSchema } from "../lib/types";

export function usePluginSchema() {
    const { namespace } = useParams<{ namespace: string }>();
    const [schema, setSchema] = useState<PluginSchema | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!namespace) return;

        setLoading(true);
        setError(null);

        pluginApi.getSchema(namespace)
            .then(setSchema)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [namespace]);

    return { schema, loading, error, namespace };
}