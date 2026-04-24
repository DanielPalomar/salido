import { useEffect, useState } from "react";
import Quagga from "quagga";

export default function App() {
  const [productos, setProductos] = useState([]);

  // ==============================
  // FETCH UNIVERSAL (MÁS APIs REALES)
  // ==============================
  const fetchProducto = async (codigo) => {
    try {
      let producto = {
        id: Date.now(),
        codigo,
        nombre: "No encontrado",
        marca: "-",
        imagen: "",
        datosExtra: ""
      };

      // Helper para aplicar datos
      const apply = (p, extra) => {
        producto = {
          ...producto,
          nombre: p.nombre || producto.nombre,
          marca: p.marca || producto.marca,
          imagen: p.imagen || producto.imagen,
          datosExtra: extra
        };
      };

      // 1️⃣ OpenFoodFacts (comida)
      try {
        const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${codigo}.json`);
        const d = await r.json();
        if (d.status === 1) {
          apply(
            {
              nombre: d.product.product_name,
              marca: d.product.brands,
              imagen: d.product.image_small_url
            },
            JSON.stringify(d.product, null, 2)
          );
        }
      } catch {}

      // 2️⃣ OpenBeautyFacts (cosméticos)
      if (producto.nombre === "No encontrado") {
        try {
          const r = await fetch(`https://world.openbeautyfacts.org/api/v0/product/${codigo}.json`);
          const d = await r.json();
          if (d.status === 1) {
            apply(
              {
                nombre: d.product.product_name,
                marca: d.product.brands,
                imagen: d.product.image_small_url
              },
              JSON.stringify(d.product, null, 2)
            );
          }
        } catch {}
      }

      // 3️⃣ OpenPetFoodFacts (mascotas)
      if (producto.nombre === "No encontrado") {
        try {
          const r = await fetch(`https://world.openpetfoodfacts.org/api/v0/product/${codigo}.json`);
          const d = await r.json();
          if (d.status === 1) {
            apply(
              {
                nombre: d.product.product_name,
                marca: d.product.brands,
                imagen: d.product.image_small_url
              },
              JSON.stringify(d.product, null, 2)
            );
          }
        } catch {}
      }

      // 4️⃣ OpenProductsFacts (otros productos)
      if (producto.nombre === "No encontrado") {
        try {
          const r = await fetch(`https://world.openproductsfacts.org/api/v0/product/${codigo}.json`);
          const d = await r.json();
          if (d.status === 1) {
            apply(
              {
                nombre: d.product.product_name,
                marca: d.product.brands,
                imagen: d.product.image_small_url
              },
              JSON.stringify(d.product, null, 2)
            );
          }
        } catch {}
      }

      // 5️⃣ UPCitemDB (general)
      if (producto.nombre === "No encontrado") {
        try {
          const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${codigo}`);
          const d = await r.json();
          if (d.items?.length) {
            const p = d.items[0];
            apply(
              {
                nombre: p.title,
                marca: p.brand,
                imagen: p.images?.[0]
              },
              JSON.stringify(p, null, 2)
            );
          }
        } catch {}
      }

      // 6️⃣ Google Books (ISBN libros)
      if (producto.nombre === "No encontrado") {
        try {
          const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${codigo}`);
          const d = await r.json();
          if (d.items?.length) {
            const p = d.items[0].volumeInfo;
            apply(
              {
                nombre: p.title,
                marca: p.publisher,
                imagen: p.imageLinks?.thumbnail
              },
              JSON.stringify(p, null, 2)
            );
          }
        } catch {}
      }

      // FALLBACK
      if (producto.nombre === "No encontrado") {
        producto = {
          ...producto,
          nombre: "No encontrado en APIs públicas",
          marca: "Manual",
          datosExtra: "Este producto no está en bases públicas. Puedes editarlo manualmente."
        };
      }

      setProductos((prev) => {
        if (prev.find((x) => x.codigo === codigo)) return prev;
        return [...prev, producto];
      });
    } catch (e) {
      console.error(e);
    }
  };

  // ==============================
  // ESCÁNER
  // ==============================
  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: document.querySelector("#scanner"),
          constraints: isMobile
            ? { facingMode: "environment" }
            : { facingMode: "user" }
        },
        decoder: {
          readers: ["ean_reader", "ean_8_reader", "code_128_reader"]
        }
      },
      (err) => {
        if (!err) Quagga.start();
      }
    );

    Quagga.onDetected((data) => {
      fetchProducto(data.codeResult.code);
    });

    return () => Quagga.stop();
  }, []);

  const editar = (id, campo, valor) => {
    setProductos(productos.map(p =>
      p.id === id ? { ...p, [campo]: valor } : p
    ));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      Quagga.decodeSingle(
        {
          src: reader.result,
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader"]
          }
        },
        (result) => {
          if (result?.codeResult) {
            fetchProducto(result.codeResult.code);
          } else {
            alert("No se detectó código");
          }
        }
      );
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="p-6 bg-green-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Scanner</h1>

      <div className="mb-4">
        <div id="scanner" className="w-64 h-40 border rounded" />
      </div>

      <input type="file" accept="image/*" onChange={handleImage} className="mb-4" />

      <table className="w-full border bg-white">
        <thead className="bg-green-500 text-white">
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Marca</th>
            <th>Imagen</th>
            <th>Datos</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id} className="border">
              <td>
                <input value={p.codigo} onChange={e => editar(p.id, "codigo", e.target.value)} />
              </td>
              <td>
                <input value={p.nombre} onChange={e => editar(p.id, "nombre", e.target.value)} />
              </td>
              <td>
                <input value={p.marca} onChange={e => editar(p.id, "marca", e.target.value)} />
              </td>
              <td>
                {p.imagen && <img src={p.imagen} width="40" />}
              </td>
              <td>
                <textarea
                  value={p.datosExtra}
                  onChange={e => editar(p.id, "datosExtra", e.target.value)}
                  className="w-40 h-20"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
