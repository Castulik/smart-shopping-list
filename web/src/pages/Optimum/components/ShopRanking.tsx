import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { type VysledekObchodu } from '../../../types/types';

interface Props {
  results: VysledekObchodu[];
  totalItemsCount: number;
  expandedIndex: number | null;
  onToggle: (index: number) => void;
}

export const ShopRanking = ({ results, totalItemsCount, expandedIndex, onToggle }: Props) => {
  return (
    <div className="flex flex-col gap-3">
      {results.map((obchod, index) => {
        const isWinner = index === 0;
        const isExpanded = expandedIndex === index;

        return (
          <div key={index}
            onClick={() => onToggle(index)}
            className={`cursor-pointer rounded-2xl transition-all duration-200 border
              ${isWinner
                ? 'bg-emerald-50 border-emerald-400 shadow-md shadow-emerald-100'
                : 'bg-white border-gray-100 shadow-sm hover:border-gray-200'
              }`}
          >

            {/* Hlavička karty */}
            <div className="p-4 flex justify-between items-center">
              <div className="flex gap-3 items-center">
                {/* Ikona trofeje pro vítěze, jinak šipka */}
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isWinner ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                  {isWinner ? <Trophy size={16} /> : (isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />)}
                </div>

                <div>
                  <h3 className={`font-bold text-lg leading-none ${isWinner ? 'text-emerald-900' : 'text-gray-800'}`}>
                    {obchod.nazevObchodu}
                  </h3>
                  <small className={`text-xs ${isWinner ? 'text-emerald-700' : 'text-gray-500'}`}>
                    Nalezeno {obchod.pocetNalezenychPolozek}/{totalItemsCount} položek
                  </small>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-xl font-extrabold ${isWinner ? 'text-emerald-700' : 'text-gray-800'}`}>
                  {obchod.celkovaCena.toFixed(0)} Kč
                </div>
                {obchod.chybejiciPolozky.length > 0 && (
                  <span className="text-[10px] text-amber-600 font-semibold block">
                    +{obchod.chybejiciPolozky.length} chybí
                  </span>
                )}
              </div>
            </div>

            {/* Detail rozbalení */}
            {isExpanded && (
              <div className="bg-white/50 border-t border-dashed border-gray-200 p-4 animate-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400 mb-2 border-b border-gray-100 pb-1">
                  <span>Položka</span>
                  <span>Cena</span>
                </div>

                <div className="space-y-2">
                  {obchod.detailNakupu.map((polozka, i) => (
                    <div key={i} className="flex justify-between items-start text-sm">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-700">
                          {polozka.pocet}x {polozka.nazevZbozi}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          ({polozka.produktVDB.name})
                        </span>
                      </div>
                      {polozka.produktVDB.discount_percent > 0 && (
                        <span className="ml-auto text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">
                          -{polozka.produktVDB.discount_percent}%
                        </span>
                      )}
                      <div className="font-mono font-medium text-gray-600 whitespace-nowrap ml-4">
                        {polozka.celkemZaPolozku.toFixed(2)} Kč
                      </div>
                    </div>
                  ))}
                </div>

                {obchod.chybejiciPolozky.length > 0 && (
                  <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-lg text-xs border border-red-100">
                    <strong className="block mb-1 uppercase text-[10px]">Nenašli jsme:</strong>
                    {obchod.chybejiciPolozky.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};