import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { type VysledekObchodu, type VysledekHledani, type PolozkaKosiku, type DbProdukt } from '../../types/types';
import { spocitatCenyProObchody, najitNejlepsiProduktyGlobalne } from '../../utils/ceny';
import { fetchActiveProducts } from '../../utils/productFetcher';

import { CartRecap } from './components/CartRecap';
import { ShopRanking } from './components/ShopRanking';
import { ProductComparison } from './components/ProductComparison';

export default function OptimumPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const locationState = location.state as { kosik?: PolozkaKosiku[] } | undefined;
    const rawKosik = locationState?.kosik;
    const kosik = useMemo<PolozkaKosiku[]>(() => rawKosik || [], [rawKosik]);

    // STAVY
    const [zebricekObchodu, setZebricekObchodu] = useState<VysledekObchodu[]>([]);
    const [vysledkyProduktu, setVysledkyProduktu] = useState<VysledekHledani[]>([]);
    const [loading, setLoading] = useState(true);
    const [rozbalenyObchodIndex, setRozbalenyObchodIndex] = useState<number | null>(null);

    const zpracovatData = useCallback((produkty: DbProdukt[]) => {
        let filtryObchodu: string[] = [];
        try {
            const ulozeneFiltry = localStorage.getItem('oblibene_obchody');
            if (ulozeneFiltry) {
                filtryObchodu = JSON.parse(ulozeneFiltry);
            }
        } catch (e) {
            console.error('Chyba při čtení filtrů obchodů:', e);
        }

        const filtrovanaData = filtryObchodu.length > 0
            ? produkty.filter(p => filtryObchodu.includes(p.shop))
            : produkty;

        const vysledkyObchodu = spocitatCenyProObchody(kosik, filtrovanaData);
        setZebricekObchodu(vysledkyObchodu);

        const vysledkyProd = najitNejlepsiProduktyGlobalne(kosik, filtrovanaData);
        setVysledkyProduktu(vysledkyProd);
        setLoading(false);
    }, [kosik]);

    useEffect(() => {
        if (kosik.length === 0) {
            navigate('/');
            return;
        }

        let isCurrent = true;
        fetchActiveProducts().then((realnaDataAkci) => {
            if (isCurrent) {
                zpracovatData(realnaDataAkci);
            }
        });

        return () => {
            isCurrent = false;
        };
    }, [kosik, navigate, zpracovatData]);

    const obnovitCeny = async () => {
        setLoading(true);
        const cerstvaData = await fetchActiveProducts(true);
        zpracovatData(cerstvaData);
    };

    const toggleObchod = (index: number) => {
        setRozbalenyObchodIndex(rozbalenyObchodIndex === index ? null : index);
    };

    return (
        <div className="pb-24">
            <CartRecap items={kosik} />

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <span className="text-sm font-medium animate-pulse">Porovnávám ceny letáků...</span>
                </div>
            ) : (
                <div className="animate-in fade-in duration-500">
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <h2 className="text-xl font-bold text-gray-800">
                                🏆 Žebříček obchodů
                            </h2>
                            <button
                                onClick={obnovitCeny}
                                className="text-xs text-emerald-600 font-semibold hover:underline"
                            >
                                🔄 Obnovit ceny
                            </button>
                        </div>
                        <ShopRanking
                            results={zebricekObchodu}
                            totalItemsCount={kosik.length}
                            expandedIndex={rozbalenyObchodIndex}
                            onToggle={toggleObchod}
                        />
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 px-2 flex items-center gap-2">
                            <span>🔍</span> Detailní srovnání
                        </h2>
                        <ProductComparison results={vysledkyProduktu} />
                    </div>
                </div>
            )}
        </div>
    );
}