import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { type ProduktDefinice, type PolozkaKosiku } from '../../types/types'
import { supabase } from '../supabaseClient'
import { searchProductsFuzzy } from '../../utils/ceny';

// Import komponent
import { QuickAddBar } from '../Nakup/components/QuickAddBar'
import { ShoppingList } from '../Nakup/components/ShoppingList'
import { ProductForm } from '../Nakup/components/ProductForm'

export default function AddFoodPage() {
    const navigate = useNavigate();
    const location = useLocation();

    // --- STAVY ---
    const [nazevReceptu, setNazevReceptu] = useState('');
    const [ingredience, setIngredience] = useState<PolozkaKosiku[]>([]);
    const [editujemeId, setEditujemeId] = useState<string | null>(null);

    const [databazePotravin, setDatabazePotravin] = useState<ProduktDefinice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // EFEKT: Načtení dat při příchodu z editace
    useEffect(() => {
        const dataZNavigace = location.state?.jidloKEditaci;
        if (dataZNavigace) {
            setNazevReceptu(dataZNavigace.nazev);
            setIngredience(dataZNavigace.ingredience);
            setEditujemeId(dataZNavigace.id);
        }
    }, [location.state]);

    // Ostatní stavy pro formulář
    const [vstup, setVstup] = useState('')
    const [naseptavacProdukty, setnaseptavacProdukty] = useState<ProduktDefinice[]>([])
    const [vybranyProdukt, setVybranyProdukt] = useState<ProduktDefinice | null>(null)
    const [pocet, setPocet] = useState(1)
    const [jednotka, setJednotka] = useState('ks')
    const [aktivniStitky, setAktivniStitky] = useState<string[]>([])
    const [upravovaneId, setUpravovaneId] = useState<string | null>(null);

    // Načtení global_products pro QuickAddBar
    useEffect(() => {
        const fetchProdukty = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.from('global_products').select('*').limit(20);
            if (!error && data) {
                const mappedData: ProduktDefinice[] = data.map((item: any) => ({
                    id: item.id,
                    nazev: item.nazev,
                    icon: item.icon,
                    vychoziJednotka: item.vychozi_jednotka,
                    mozneJednotky: item.mozne_jednotky,
                    stitky: item.stitky || []
                }));
                setDatabazePotravin(mappedData);
            }
            setIsLoading(false);
        };
        fetchProdukty();
    }, []);

    // Fuzzy vyhledávání
    useEffect(() => {
        if (!vstup || vstup.trim().length < 2) {
            setnaseptavacProdukty([]);
            return;
        }
        if (vybranyProdukt && vybranyProdukt.nazev === vstup) return;

        const timeoutId = setTimeout(async () => {
            try {
                const vysledky = await searchProductsFuzzy(vstup);
                setnaseptavacProdukty(vysledky);
            } catch (err) {
                console.error("Chyba při hledání:", err);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [vstup, vybranyProdukt]);

    const vyberProdukt = (produkt: ProduktDefinice) => {
        setVybranyProdukt(produkt);
        setVstup(produkt.nazev);
        setJednotka(produkt.vychoziJednotka || 'ks');
        setPocet(1);
        setnaseptavacProdukty([]);
    }

    const pridatDoIngredienci = async () => {
        if (!vybranyProdukt) return;

        if (vybranyProdukt.id === 'custom-item' && !upravovaneId) {
            // Použijeme try/catch pro případ, že by vypadl internet nebo DB
            try {
                const { error } = await supabase
                    .from('user_suggestions')
                    .insert([{ nazev: vybranyProdukt.nazev }]);

                if (error) throw error;
                console.log("🚀 Návrh na nové zboží odeslán!");
            } catch (err) {
                console.error("Chyba při ukládání návrhu:", err);
                // Tady nemusíme uživatele otravovat alertem, je to jen "podkresová" funkce
            }
        }

        if (upravovaneId) {
            setIngredience(ingredience.map(p => p.id === upravovaneId ? {
                ...p,
                nazev: vybranyProdukt.nazev,
                pocet: pocet,
                jednotka: jednotka,
                vybraneStitky: aktivniStitky
            } : p));
        } else {
            const novaPolozka: PolozkaKosiku = {
                id: crypto.randomUUID(),
                nazev: vybranyProdukt.nazev,
                pocet: pocet,
                jednotka: jednotka,
                vybraneStitky: aktivniStitky
            };
            setIngredience([...ingredience, novaPolozka]);
        }
        ResetFormulare();
    }

    const vyberVlastni = () => {
        const novyProdukt: ProduktDefinice = {
            id: 'custom-item',
            nazev: vstup,
            icon: '🛒',
            vychoziJednotka: 'ks',
            mozneJednotky: ['ks', 'kg', 'l', 'g', 'balení'],
            stitky: []
        };
        setVybranyProdukt(novyProdukt);
        setnaseptavacProdukty([]);
        setJednotka('ks');
    }

    const ResetFormulare = () => {
        setVstup('');
        setVybranyProdukt(null);
        setAktivniStitky([]);
        setPocet(1);
        setJednotka('ks');
        setUpravovaneId(null);
        setnaseptavacProdukty([]);
    }

    // V AddFoodPage.tsx uprav funkci ulozitRecept:

    const ulozitRecept = async () => {
        if (!nazevReceptu.trim()) return;

        const novyRecept = {
            id: editujemeId || crypto.randomUUID(),
            nazev: nazevReceptu,
            emoji: '🍲',
            ingredience: ingredience
        };

        // 1. VŽDY ulož do localStorage (offline-first)
        const existujici = JSON.parse(localStorage.getItem('moje_ulozena_jidla') || '[]');
        const aktualizovane = editujemeId
            ? existujici.map((r: any) => r.id === editujemeId ? novyRecept : r)
            : [...existujici, novyRecept];

        localStorage.setItem('moje_ulozena_jidla', JSON.stringify(aktualizovane));

        // 2. POKUD je uživatel přihlášen, pošli i do Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await supabase.from('user_recipes').upsert({
                ...novyRecept,
                user_id: session.user.id
            });
        }

        navigate('/favorite');
    }

    return (
        <div className="pb-32 px-4">
            <h2 className="text-xl font-bold mt-6 mb-2 ml-1">
                {editujemeId ? '✏️ Upravit recept' : '👨‍🍳 Nový recept'}
            </h2>

            <div className="py-4">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Název tvého receptu
                </label>
                <input
                    type="text"
                    value={nazevReceptu}
                    onChange={(e) => setNazevReceptu(e.target.value)}
                    placeholder="Třeba: Babiččin guláš..."
                    className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 text-lg font-semibold focus:border-emerald-400 outline-none transition-all shadow-sm"
                />
            </div>

            <ProductForm
                kosik={false}
                vstup={vstup}
                setVstup={setVstup}
                naseptavacProdukty={naseptavacProdukty}
                vybranyProdukt={vybranyProdukt}
                onVybratZNaspetavace={vyberProdukt}
                onVybratVlastni={vyberVlastni}
                pocet={pocet}
                setPocet={setPocet}
                jednotka={jednotka}
                setJednotka={setJednotka}
                aktivniStitky={aktivniStitky}
                toggleStitek={(s) => setAktivniStitky(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                onConfirm={pridatDoIngredienci}
                onCancel={ResetFormulare}
                submitLabel={upravovaneId ? '💾 Uložit změny' : undefined}
            />

            {!isLoading && databazePotravin.length > 0 && !upravovaneId && (
                <QuickAddBar produkty={databazePotravin.slice(0, 8)} onSelect={vyberProdukt} />
            )}

            <div className="mt-8 mb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                    Ingredience v receptu ({ingredience.length})
                </h3>
                <ShoppingList
                    kosik={false}
                    items={ingredience}
                    onDelete={(id) => setIngredience(ingredience.filter(p => p.id !== id))}
                    onEdit={(p) => {
                        setUpravovaneId(p.id);
                        setVybranyProdukt({ id: 'edit', nazev: p.nazev, icon: '✏️', vychoziJednotka: p.jednotka, mozneJednotky: [], stitky: [] });
                        setVstup(p.nazev);
                        setPocet(p.pocet);
                        setJednotka(p.jednotka);
                        setAktivniStitky(p.vybraneStitky);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                />
            </div>

            {ingredience.length > 0 && (
                <div className="fixed bottom-20 left-4 right-4 z-40">
                    <button
                        className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/30 active:scale-95 transition-transform"
                        onClick={ulozitRecept}
                    >
                        <span>{editujemeId ? '💾 Uložit změny receptu' : '✨ Uložit do oblíbených jídel'}</span>
                    </button>
                </div>
            )}
        </div>
    )
}