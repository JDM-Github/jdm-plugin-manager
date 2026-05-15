import { useState, useCallback } from "react";

interface LinkModal {
    namespace: string;
    pkg: string;
}

export function useLinkModal() {
    const [linkModal, setLinkModal] = useState<LinkModal | null>(null);
    const [linkPath, setLinkPath] = useState("");
    const [linkError, setLinkError] = useState<string | null>(null);

    const openLinkModal = useCallback((namespace: string, pkg: string) => {
        setLinkPath("");
        setLinkError(null);
        setLinkModal({ namespace, pkg });
    }, []);

    const closeLinkModal = useCallback(() => {
        setLinkModal(null);
        setLinkPath("");
        setLinkError(null);
    }, []);

    const updateLinkPath = useCallback((path: string) => {
        setLinkPath(path);
        setLinkError(null);
    }, []);

    return {
        linkModal,
        linkPath,
        linkError,
        setLinkError,
        openLinkModal,
        closeLinkModal,
        updateLinkPath,
    };
}