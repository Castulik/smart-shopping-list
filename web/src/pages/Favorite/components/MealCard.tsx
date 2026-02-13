import { useMemo, useState } from 'react'; // Přidán useState
import { ChevronRight, ShoppingCart, ListPlus, Edit2, Check, X } from 'lucide-react'; // Přidány ikony
import { type PolozkaKosiku, type DbProdukt } from '../../../types/types';
import { spocitatCenyProObchody } from '../../../utils/ceny';

interface UlozeneJidlo {
  id: string;
  nazev: string;
  emoji: string;
  ingredience: PolozkaKosiku[];
}

interface Props {
  jidlo: UlozeneJidlo;
  dbData: DbProdukt[];
  onBuy: (jidlo: UlozeneJidlo) => void;
  onEdit: (jidlo: UlozeneJidlo) => void;
  onAddToList: (ingredience: PolozkaKosiku[]) => void; // Změněno na pole ingrediencí
}

export const MealCard = ({ jidlo, dbData, onBuy, onEdit, onAddToList }: Props) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Výpočet TOP 3 cen
  const top3Obchody = useMemo(() => {
    if (dbData.length === 0) return [];
    return spocitatCenyProObchody(jidlo.ingredience, dbData).slice(0, 3);
  }, [jidlo.ingredience, dbData]);

  // Zapnutí výběru - automaticky označíme vše
  const startSelection = () => {
    setSelectedIds(new Set(jidlo.ingredience.map(i => i.id)));
    setIsSelecting(true);
  };

  const toggleIngredient = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleConfirmAdd = () => {
    const toAdd = jidlo.ingredience.filter(i => selectedIds.has(i.id));
    if (toAdd.length > 0) {
      onAddToList(toAdd);
      setIsSelecting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100 transition-all hover:shadow-md">

      {/* 1. Hlava karty */}
      {!isSelecting ? (
        <div className="flex gap-4 items-start mb-4 cursor-pointer group" onClick={() => onEdit(jidlo)}>
          <div className="text-3xl bg-gray-50 w-14 h-14 flex items-center justify-center rounded-2xl shrink-0 group-hover:bg-blue-50 transition-colors border border-gray-50">
            {jidlo.emoji}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-gray-800 leading-tight group-hover:text-primary transition-colors">
                {jidlo.nazev}
              </h3>
              <Edit2 size={16} className="text-gray-300 group-hover:text-blue-400 mt-1" />
            </div>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
              {jidlo.ingredience.map(i => i.nazev).join(', ')}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 text-sm italic">Co z toho nemáš doma?</h3>
            <button onClick={() => setIsSelecting(false)} className="p-1 text-gray-400 hover:text-red-500">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-2">
            {jidlo.ingredience.map((ing) => (
              <label
                key={ing.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedIds.has(ing.id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100 opacity-60'
                  }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedIds.has(ing.id)}
                  onChange={() => toggleIngredient(ing.id)}
                />
                <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedIds.has(ing.id) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'
                  }`}>
                  {selectedIds.has(ing.id) && <Check size={14} strokeWidth={4} />}
                </div>
                <span className="text-sm font-semibold flex-1">{ing.nazev}</span>
                <span className="text-xs text-gray-400">{ing.pocet} {ing.jednotka}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {!isSelecting && <div className="h-px bg-gray-50 -mx-5 mb-4"></div>}

      {/* 2. Ceny - zobrazujeme jen když nevybíráme, aby karta nebyla moc dlouhá */}
      {!isSelecting && (
        <div className="mb-5">
          <span className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-widest">Odhad ceny:</span>
          <div className="flex gap-2">
            {top3Obchody.map((obchod, index) => (
              <div key={obchod.nazevObchodu} className={`flex-1 border rounded-2xl py-2 px-1 flex flex-col items-center justify-center ${index === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                <span className="text-[9px] uppercase font-black opacity-70">{obchod.nazevObchodu}</span>
                <span className="text-sm font-black">{obchod.celkovaCena.toFixed(0)} Kč</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Tlačítka */}
      <div className="flex flex-col gap-2">
        {!isSelecting ? (
          <>
            <button
              className="w-full bg-blue-50 text-blue-600 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-blue-100"
              onClick={startSelection}
            >
              <ListPlus size={18} />
              <span>Dát na nákupní seznam</span>
            </button>
            <button
              className="w-full bg-emerald-500 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 border-b-4 border-emerald-700"
              onClick={() => onBuy(jidlo)}
            >
              <ShoppingCart size={18} />
              <span>Koupit za nejlepší cenu</span>
            </button>
          </>
        ) : (
          <button
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
            onClick={handleConfirmAdd}
            disabled={selectedIds.size === 0}
          >
            <Check size={20} />
            <span>Přidat vybrané ({selectedIds.size})</span>
          </button>
        )}
      </div>
    </div>
  );
};