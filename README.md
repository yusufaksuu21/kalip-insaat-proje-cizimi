# Kalip Plani ve Yapısal On Boyutlandirma Araci

Insaat muhendisleri ve ogrencileri icin gelistirilmis, tarayici uzerinde calisan tek sayfalik bir kalip plani ve on boyutlandirma aracidir. Proje; kolon, kiris ve perde duvar yerlesimini gorsellestirir, temel muhendislik kontrollerini yapar ve on rapor/disa aktarma ciktilari uretir.

> Not: Bu uygulama kesin statik proje hesabi yerine gecmez. Sonuclar on boyutlandirma ve egitim amaclidir; TS 500 ve TBDY 2018 kapsaminda yetkili bir insaat muhendisi tarafindan kontrol edilmelidir.

## Ozellikler

- Kolon koordinati, kolon kesiti ve perde duvar girisi
- Kolon hizalarina gore otomatik kiris algilama
- Canvas uzerinde etkilesimli kalip plani cizimi
- Yakinlastirma, uzaklastirma, ekrana sigdirma ve izgara kontrolu
- Beton sinifi, celik sinifi, kat sayisi, kat yuksekligi ve doseme tipi secimi
- Olu yuk, canli yuk ve zemin tasima gucu girisi
- TBDY 2018 icin basitlestirilmis deprem parametreleri
- Kolon, kiris, perde ve temel on kontrolleri
- Tasarim karar ozeti
- Yaklasik beton hacmi ve donati agirligi metraji
- DXF, PDF, DOCX ve JSON disa aktarma
- JSON proje kaydetme/yukleme
- Acik/koyu tema destegi

## Ekranlar

Uygulama dort ana bolumden olusur:

- **Kalip Plani:** Kolon, kiris ve perdelerin plan gorunumu.
- **Hesap Raporu:** Yuk kombinasyonlari, deprem ozeti, kesit sonuclari ve muhendislik kontrolleri.
- **Muhendislik Araclari:** Beton, donati, temel alani ve kiris derinligi on tahminleri.
- **Disa Aktar:** DXF, PDF, DOCX ve JSON ciktilari.

## Kullanim

Bu proje herhangi bir kurulum gerektirmez.

1. Depoyu bilgisayariniza indirin veya klonlayin.
2. `index.html` dosyasini tarayicida acin.
3. Sol panelden proje bilgilerini, kolonlari ve perdeleri girin.
4. **Hesapla ve Ciz** butonuna basin.
5. Raporu inceleyin veya gerekli formata disa aktarin.

## Klasor Yapisi

```text
.
|-- index.html
|-- assets
|   |-- css
|   |   `-- styles.css
|   `-- js
|       |-- app.js
|       |-- calculations.js
|       |-- canvas.js
|       |-- config.js
|       |-- export.js
|       `-- storage.js
|-- LICENSE
`-- README.md
```

## Teknik Bilgiler

- HTML, CSS ve vanilla JavaScript ile gelistirildi.
- Plan cizimi HTML5 Canvas ile yapilir.
- PDF ciktilari icin jsPDF ve jsPDF AutoTable kullanilir.
- DOCX ciktilari icin JSZip kullanilir.
- Proje verileri tarayici `localStorage` uzerinde taslak olarak saklanir.



## Gelistirme Fikirleri

- Proje ekran goruntuleri eklenebilir.
- Malzeme birim fiyatlari girilerek yaklasik maliyet modulu eklenebilir.
- Kolon/perde/kiris secimi icin planda duzenleme modu eklenebilir.
- Daha detayli TBDY 2018 spektrum ve DD-2/DD-3 parametre girisi eklenebilir.
- TS 500'e gore daha kapsamli kesit ve donati kontrolleri eklenebilir.

## Lisans

Bu proje MIT lisansi ile yayinlanmistir. Detaylar icin `LICENSE` dosyasina bakin.
