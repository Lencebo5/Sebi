import type { Affirmation, CategoryId } from '@/models/types';

/**
 * Original affirmation content (Serbian Latin). All texts are written for
 * this app — nothing is copied from other products.
 *
 * To add a pack: append entries here (or split into per-category files and
 * concat them). Ids are stable — never reuse an id for different text.
 */

type Entry = [id: string, text: string, tags: string[]];

function pack(
  category: Exclude<CategoryId, 'today'>,
  premium: boolean,
  entries: Entry[],
): Affirmation[] {
  return entries.map(([id, text, tags]) => ({ id, category, text, premium, tags }));
}

export const AFFIRMATIONS: Affirmation[] = [
  ...pack('confidence', false, [
    ['confidence_001', 'Ne moram svima da dokazujem svoju vrednost.', ['self-worth']],
    ['confidence_002', 'Tuđe mišljenje nije merilo moje vrednosti.', ['self-worth', 'opinions']],
    ['confidence_003', 'Smem da kažem šta mislim, mirno i jasno.', ['voice']],
    ['confidence_004', 'Greška ne znači da sam pogrešna osoba.', ['mistakes']],
    ['confidence_005', 'Mogu da promenim pravac bez osećaja da sam pogrešio.', ['change']],
    ['confidence_006', 'Ono što drugi umeju, mogu i ja da naučim.', ['growth']],
    ['confidence_007', 'Ne poredim svoj početak sa tuđom sredinom puta.', ['comparison']],
    ['confidence_008', 'Danas stojim iza svojih odluka.', ['decisions']],
    ['confidence_009', 'Smem da zauzmem prostor koji mi pripada.', ['presence']],
    ['confidence_010', 'Moje "ne" je potpuna rečenica.', ['boundaries']],
    ['confidence_011', 'Nesigurnost je osećaj, a ne istina o meni.', ['doubt']],
    ['confidence_012', 'Već sam prošao kroz stvari za koje sam mislio da ne mogu.', ['resilience']],
    ['confidence_013', 'Ne moram da budem najglasniji da bih bio siguran u sebe.', ['quiet-strength']],
    ['confidence_014', 'Dozvoljavam sebi da budem početnik.', ['beginner']],
    ['confidence_015', 'Verujem svojoj proceni, čak i kada se drugi ne slažu.', ['judgement']],
  ]),

  ...pack('motivation', false, [
    ['motivation_001', 'Ne moram danas sve da rešim. Dovoljno je da napravim sledeći korak.', ['next-step']],
    ['motivation_002', 'Počinjem pre nego što se osetim potpuno spremno.', ['start']],
    ['motivation_003', 'Deset minuta rada vredi više od sat vremena razmišljanja o radu.', ['action']],
    ['motivation_004', 'Biram jednu stvar i završavam je.', ['focus']],
    ['motivation_005', 'Napredak je tih. Ne mora da se vidi svaki dan da bi postojao.', ['progress']],
    ['motivation_006', 'Umoran nije isto što i gotov.', ['persistence']],
    ['motivation_007', 'Ne čekam savršen trenutak. Radim sa ovim koji imam.', ['now']],
    ['motivation_008', 'Danas radim za onoga ko ću biti za godinu dana.', ['future-self']],
    ['motivation_009', 'Malo, ali svaki dan — tako se grade velike stvari.', ['consistency']],
    ['motivation_010', 'Odustajanje od svega nije jedina alternativa savršenstvu.', ['perfectionism']],
    ['motivation_011', 'Teško ne znači nemoguće. Znači samo da traje duže.', ['difficulty']],
    ['motivation_012', 'Vraćam se poslu bez drame, kao da se nisam ni prekidao.', ['restart']],
    ['motivation_013', 'Moja disciplina je oblik brige o sebi.', ['discipline']],
    ['motivation_014', 'Prvo najmanji mogući korak. Ostalo dolazi lakše.', ['small-steps']],
    ['motivation_015', 'Ne moram da imam motivaciju da bih počeo. Često dođe usput.', ['momentum']],
  ]),

  ...pack('morning', false, [
    ['morning_001', 'Ovaj dan još nije napisan. Ja držim olovku.', ['fresh-start']],
    ['morning_002', 'Jutro ne mora da bude savršeno da bi dan bio dobar.', ['acceptance']],
    ['morning_003', 'Danas biram šta zaslužuje moju pažnju.', ['attention']],
    ['morning_004', 'Ustajem polako. Žurba može da sačeka pet minuta.', ['slow']],
    ['morning_005', 'Jedna dobra odluka ujutru povuče ostale za sobom.', ['momentum']],
    ['morning_006', 'Ne otvaram tuđe živote pre nego što otvorim svoj dan.', ['phone', 'attention']],
    ['morning_007', 'Danas mi ne treba ceo plan. Treba mi samo prvi korak.', ['first-step']],
    ['morning_008', 'Jutros sebi želim dobar dan — i mislim to ozbiljno.', ['kindness']],
    ['morning_009', 'Novi dan je nova prilika da budem malo bliži sebi.', ['self-connection']],
    ['morning_010', 'Ono što je juče bilo teško, ne mora da pređe u danas.', ['letting-go']],
    ['morning_011', 'Dišem, budim se, krećem. Toliko je dovoljno za početak.', ['simplicity']],
    ['morning_012', 'Danas ću bar jednom izaći na vazduh i podsetiti se da svet postoji.', ['outside']],
    ['morning_013', 'Biram da današnji dan ne živim na autopilotu.', ['presence']],
    ['morning_014', 'Kafa može da sačeka trideset sekundi dok udahnem s namerom.', ['ritual']],
    ['morning_015', 'Danas sam na svojoj strani.', ['self-support']],
  ]),

  ...pack('self_love', true, [
    ['self_love_001', 'Govorim sebi onako kako bih govorio nekome koga volim.', ['self-talk']],
    ['self_love_002', 'Nisam projekat koji treba popraviti. Čovek sam koji raste.', ['growth']],
    ['self_love_003', 'Odmor ne moram da zaslužim. Potreban mi je, i to je dovoljno.', ['rest']],
    ['self_love_004', 'Moje telo je moj dom, a ne izložba za druge.', ['body']],
    ['self_love_005', 'Smem da imam potrebe i smem da ih kažem naglas.', ['needs']],
    ['self_love_006', 'Danas sebi opraštam jednu staru grešku.', ['forgiveness']],
    ['self_love_007', 'Nisam manje vredan kada mi ne ide.', ['worth']],
    ['self_love_008', 'Briga o sebi nije sebičnost. To je održavanje.', ['self-care']],
    ['self_love_009', 'Ne moram da budem koristan da bih bio vredan.', ['being']],
    ['self_love_010', 'Prihvatam kompliment bez objašnjavanja zašto ne zaslužujem.', ['compliments']],
    ['self_love_011', 'I kada grešim, ostajem na svojoj strani.', ['self-support']],
    ['self_love_012', 'Moja osećanja su informacija, a ne slabost.', ['feelings']],
    ['self_love_013', 'Biram društvo posle kog se osećam bolje, ne gore.', ['company']],
    ['self_love_014', 'Nežnost prema sebi nije razmaženost. To je zrelost.', ['gentleness']],
    ['self_love_015', 'Dovoljno sam, i onda kada nisam na sto posto.', ['enough']],
  ]),

  ...pack('calm', true, [
    ['calm_001', 'Ne moram odmah da odgovorim. Smem prvo da udahnem.', ['pause']],
    ['calm_002', 'Većina stvari koje me brinu nikada se ne dogodi.', ['worry']],
    ['calm_003', 'Mir nije odsustvo obaveza, nego način na koji im prilazim.', ['approach']],
    ['calm_004', 'Jedna po jedna stvar. Tako se sve stigne.', ['one-thing']],
    ['calm_005', 'Mogu da spustim ono što nije moje da nosim.', ['letting-go']],
    ['calm_006', 'Telo mi je ovde. Puštam i misli da se vrate ovde.', ['presence']],
    ['calm_007', 'Ne moram da budem dostupan svima u svakom trenutku.', ['availability']],
    ['calm_008', 'Pet mirnih udaha promeni više nego pet sati brige.', ['breathing']],
    ['calm_009', 'Haos oko mene ne mora da postane haos u meni.', ['inner-peace']],
    ['calm_010', 'Smem da kažem: sada mi je previše, treba mi pauza.', ['limits']],
    ['calm_011', 'Ono što večeras deluje ogromno, ujutru je obično manje.', ['perspective']],
    ['calm_012', 'Biram sporije, pa tačnije.', ['slowness']],
    ['calm_013', 'Ne hvatam svaku misao koja proleti. Neka prođe.', ['thoughts']],
    ['calm_014', 'Trenutno je ovako. Neće zauvek biti ovako.', ['impermanence']],
    ['calm_015', 'Danas ne moram nigde da stignem prvi.', ['no-rush']],
  ]),

  ...pack('gratitude', true, [
    ['gratitude_001', 'Danas ću primetiti jednu stvar koju obično uzimam zdravo za gotovo.', ['noticing']],
    ['gratitude_002', 'Imam više nego što mi se čini kada gledam samo šta nedostaje.', ['perspective']],
    ['gratitude_003', 'Zahvalnost mi ne traži savršen život, samo otvorene oči.', ['awareness']],
    ['gratitude_004', 'Neko negde želi baš ovakav običan dan kakav ja imam.', ['ordinary']],
    ['gratitude_005', 'Hvala telu što me nosi i kada mu ne posvećujem pažnju.', ['body']],
    ['gratitude_006', 'Mali rituali — kafa, šetnja, poziv — drže moj dan zajedno.', ['rituals']],
    ['gratitude_007', 'Danas ću nekome reći da mi znači. Bez posebnog povoda.', ['people']],
    ['gratitude_008', 'I ovaj težak period jednom će biti priča koju sam izneo.', ['hard-times']],
    ['gratitude_009', 'Zahvalnost ne poriče probleme. Samo im ne daje sav prostor.', ['balance']],
    ['gratitude_010', 'Krov, obrok, neko ko mi se javi — nije malo. To je osnova.', ['basics']],
    ['gratitude_011', 'Sećam se koliko sam nekad želeo ovo što danas imam.', ['past-wishes']],
    ['gratitude_012', 'Lepo mi je od malih stvari češće nego od velikih.', ['small-things']],
    ['gratitude_013', 'Večeras ću naći tri stvari koje su danas bile dobre.', ['practice']],
    ['gratitude_014', 'Zahvalan sam ljudima koji su me trpeli dok sam učio.', ['people', 'growth']],
    ['gratitude_015', 'Danas mi je dovoljno da je dan bio pristojan prema meni.', ['enough']],
  ]),

  ...pack('work', true, [
    ['work_001', 'Moj posao je deo mog života, a ne ceo moj život.', ['balance']],
    ['work_002', 'Urađeno i solidno je bolje od savršenog i nezavršenog.', ['done']],
    ['work_003', 'Moje vreme ima vrednost.', ['time']],
    ['work_004', 'Smem da pitam kada ne znam. Tako izgledaju ljudi koji uče.', ['asking']],
    ['work_005', 'Ne moram da budem stalno zauzet da bih bio vredan saradnik.', ['busyness']],
    ['work_006', 'Fokus na jedan zadatak nije lenjost prema ostalima.', ['focus']],
    ['work_007', 'Tuđi uspeh ne umanjuje prostor za moj.', ['comparison']],
    ['work_008', 'Radim ozbiljno, ali sebe ne shvatam preozbiljno.', ['lightness']],
    ['work_009', 'Povratna informacija je o poslu, ne o meni kao osobi.', ['feedback']],
    ['work_010', 'Smem da tražim ono što mislim da sam zaradio.', ['negotiation']],
    ['work_011', 'Pauza usred rada nije gubljenje vremena. Ona je deo rada.', ['breaks']],
    ['work_012', 'Ne nosim posao u krevet. Sutra ga čeka sto, ne jastuk.', ['boundaries']],
    ['work_013', 'Karijera je maraton sa okrepnim stanicama, ne sprint bez daha.', ['long-game']],
    ['work_014', 'Danas ću uraditi ono važno pre onoga što je samo hitno.', ['priorities']],
    ['work_015', 'Moj napredak se meri u mesecima, ne u lošim danima.', ['perspective']],
  ]),

  ...pack('money', true, [
    ['money_001', 'Novac je alat, a ne ocena moje vrednosti.', ['worth']],
    ['money_002', 'Smem da pogledam stanje na računu bez panike. Informacija mi pomaže.', ['awareness']],
    ['money_003', 'Mala ušteda svakog meseca je i dalje ušteda.', ['saving']],
    ['money_004', 'Ne kupujem da bih impresionirao ljude koje jedva poznajem.', ['spending']],
    ['money_005', 'Mirno mogu da kažem: to trenutno nije u mom budžetu.', ['boundaries']],
    ['money_006', 'Učim o novcu. Niko se nije rodio sa tim znanjem.', ['learning']],
    ['money_007', 'Moje finansijske greške iz prošlosti ne određuju moju budućnost.', ['past']],
    ['money_008', 'Plaćeno mirno spavanje vredi više od skupih stvari.', ['peace']],
    ['money_009', 'Pregovaranje o ceni i plati nije nepristojnost.', ['negotiation']],
    ['money_010', 'Danas donosim jednu malu, pametnu odluku o novcu.', ['small-steps']],
    ['money_011', 'Ne poredim svoj novčanik sa tuđim objavama.', ['comparison']],
    ['money_012', 'Više volim slobodu koju novac čuva nego stvari koje kupuje.', ['freedom']],
    ['money_013', 'Imati plan za novac znači manje straha od njega.', ['planning']],
    ['money_014', 'Smem da uložim u sebe — znanje se ne troši.', ['investment']],
    ['money_015', 'Dovoljno je pojam koji sam definišem, a ne reklame.', ['enough']],
  ]),

  ...pack('relationships', true, [
    ['relationships_001', 'Biram ljude pored kojih ne moram da glumim.', ['authenticity']],
    ['relationships_002', 'Slušam da bih razumeo, a ne da bih odmah odgovorio.', ['listening']],
    ['relationships_003', 'Granica nije zid. Ona je uputstvo kako da budemo dobri jedno prema drugom.', ['boundaries']],
    ['relationships_004', 'Ne mogu da budem sve svima. Mogu da budem prisutan za svoje ljude.', ['presence']],
    ['relationships_005', 'Smem da tražim ono što mi treba, umesto da čekam da neko pogodi.', ['needs']],
    ['relationships_006', 'Izvinjenje ne umanjuje moju vrednost. Naprotiv.', ['apology']],
    ['relationships_007', 'Tuđe loše raspoloženje nije uvek moja krivica.', ['responsibility']],
    ['relationships_008', 'Bliskost se gradi malim stvarima: porukom, pažnjom, vremenom.', ['small-things']],
    ['relationships_009', 'Neslaganje ne mora da bude svađa.', ['conflict']],
    ['relationships_010', 'Puštam odnose koji žive samo od moje snage.', ['letting-go']],
    ['relationships_011', 'Ne moram da pobedim u razgovoru sa osobom koju volim.', ['ego']],
    ['relationships_012', 'Smem da kažem: povredilo me je to. Mirno i bez optužbe.', ['honesty']],
    ['relationships_013', 'Ljubav se pokazuje i u tome kako se svađamo.', ['conflict', 'love']],
    ['relationships_014', 'Danas ću se javiti osobi na koju često pomislim.', ['connection']],
    ['relationships_015', 'Dobri odnosi traže i dobru vezu sa samim sobom.', ['self-connection']],
  ]),

  ...pack('habits', true, [
    ['habits_001', 'Ne menjam ceo život preko noći. Menjam jednu naviku.', ['one-thing']],
    ['habits_002', 'Čaša vode i kratka šetnja su početak, ne sitnica.', ['basics']],
    ['habits_003', 'Propušten dan nije propala navika.', ['slip']],
    ['habits_004', 'Pravim okruženje u kom je dobra odluka lakša.', ['environment']],
    ['habits_005', 'San nije luksuz. San je temelj svega ostalog.', ['sleep']],
    ['habits_006', 'Ne treba mi savršen plan ishrane, nego sledeći dobar obrok.', ['food']],
    ['habits_007', 'Telefon može da sačeka. Moje telo traži da se pomeri.', ['movement']],
    ['habits_008', 'Deset minuta danas vredi više od dva sata jednom mesečno.', ['consistency']],
    ['habits_009', 'Nagrađujem trud, a ne samo rezultat na vagi.', ['effort']],
    ['habits_010', 'Kad padnem, ne dodajem sebi i osudu. Samo se vratim.', ['comeback']],
    ['habits_011', 'Moje navike su glasanje za osobu koja postajem.', ['identity']],
    ['habits_012', 'Odmor je deo treninga, ne njegova suprotnost.', ['rest']],
    ['habits_013', 'Biram dosadnu doslednost umesto uzbudljivog haosa.', ['consistency']],
    ['habits_014', 'Danas ležem na spavanje malo ranije, za sutrašnjeg sebe.', ['sleep', 'future-self']],
    ['habits_015', 'Zdravlje gradim tiho, iz dana u dan.', ['long-game']],
  ]),

  ...pack('hard_days', true, [
    ['hard_days_001', 'Ne moraš danas da budeš savršen. Samo nastavi.', ['keep-going']],
    ['hard_days_002', 'Loš dan je dan. Nije presuda.', ['perspective']],
    ['hard_days_003', 'Danas mi je dovoljno da uradim osnovno: jedem, dišem, izdržim.', ['basics']],
    ['hard_days_004', 'Smem da plačem. Suze nisu poraz.', ['feelings']],
    ['hard_days_005', 'Preživeo sam sve svoje najgore dane do sada. I ovaj ću.', ['resilience']],
    ['hard_days_006', 'Ne moram sada da donosim velike odluke. Samo da prođem kroz danas.', ['no-decisions']],
    ['hard_days_007', 'Teško mi je — i to smem da kažem naglas.', ['honesty']],
    ['hard_days_008', 'Tražiti pomoć je potez jakih ljudi.', ['help']],
    ['hard_days_009', 'Ovaj osećaj je talas. Doći će i povući se.', ['waves']],
    ['hard_days_010', 'Danas se ne poredim ni sa kim, pa ni sa sobom od juče.', ['comparison']],
    ['hard_days_011', 'Malo toplog obroka i malo sna — i svet već izgleda drugačije.', ['basics']],
    ['hard_days_012', 'Nisam sam, čak i kada se tako osećam.', ['loneliness']],
    ['hard_days_013', 'Dozvoljavam da dan bude loš, a da ja i dalje budem dobar.', ['self-worth']],
    ['hard_days_014', 'Sutra ne mora da liči na danas.', ['tomorrow']],
    ['hard_days_015', 'Korak po korak. Danas je dovoljan i po korak.', ['small-steps']],
  ]),

  ...pack('sleep', true, [
    ['sleep_001', 'Dan je gotov. Ono što nisam stigao, čeka me odmoran.', ['closure']],
    ['sleep_002', 'Spuštam telefon. Spuštam i dan.', ['phone']],
    ['sleep_003', 'Večeras ne rešavam probleme. Večeras se odmaram.', ['rest']],
    ['sleep_004', 'Uradio sam danas koliko sam mogao. To je dovoljno.', ['enough']],
    ['sleep_005', 'Brige mogu da prespavaju u drugoj sobi.', ['worry']],
    ['sleep_006', 'Svaki izdah je malo tiši od prethodnog.', ['breathing']],
    ['sleep_007', 'Ne moram sada da imam odgovore. Noć nije za odgovore.', ['night']],
    ['sleep_008', 'Zahvalan sam za jedan dobar trenutak iz današnjeg dana.', ['gratitude']],
    ['sleep_009', 'Krevet je za odmor, ne za suđenje samom sebi.', ['self-talk']],
    ['sleep_010', 'Sutra počinje tek sutra. Sada je vreme za mir.', ['present']],
    ['sleep_011', 'Puštam mišiće da omekšaju, jedan po jedan.', ['body']],
    ['sleep_012', 'I misli imaju pravo na počinak.', ['thoughts']],
    ['sleep_013', 'Danas je bilo kako je bilo. Sada biram tišinu.', ['acceptance']],
    ['sleep_014', 'San je najbolji poklon koji večeras mogu sebi da dam.', ['gift']],
    ['sleep_015', 'Laku noć i meni. Zaslužio sam je.', ['kindness']],
  ]),
];

const byId = new Map(AFFIRMATIONS.map((a) => [a.id, a]));

export function getAffirmation(id: string): Affirmation | undefined {
  return byId.get(id);
}

export function getAffirmationsByCategory(category: CategoryId): Affirmation[] {
  return AFFIRMATIONS.filter((a) => a.category === category);
}
