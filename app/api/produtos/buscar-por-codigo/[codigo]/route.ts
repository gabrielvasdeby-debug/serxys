import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await params;

  if (!codigo) {
    return NextResponse.json({ error: 'Código não fornecido' }, { status: 400 });
  }

  try {
    // Tenta primeiro o UPCItemDB (Geral)
    let productData = await fetchFromUPCItemDB(codigo);

    // Se não encontrar, tenta o Open Food Facts (Muitos produtos brasileiros estão aqui, mesmo não sendo comida)
    if (!productData) {
      productData = await fetchFromOpenFoodFacts(codigo);
    }

    if (productData) {
      return NextResponse.json({
        status: true,
        ...productData
      });
    }

    return NextResponse.json({ status: false, message: 'Produto não encontrado em nossas bases de dados externas. Tente cadastrar manualmente.' });
  } catch (error: any) {
    console.error('Erro ao buscar produto por código:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar produto', details: error.message }, { status: 500 });
  }
}

async function fetchFromUPCItemDB(codigo: string) {
  try {
    const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${codigo}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 } // Cache por 1 hora
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        nome: item.title,
        marca: item.brand,
        categoria: item.category,
        image: item.images && item.images.length > 0 ? item.images[0] : null,
        source: 'upcitemdb'
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchFromOpenFoodFacts(codigo: string) {
  try {
    // OFF API para busca por código de barras
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${codigo}.json`, {
        next: { revalidate: 3600 }
    });
    
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status === 1 && data.product) {
      const p = data.product;
      return {
        nome: p.product_name || p.generic_name || null,
        marca: p.brands || null,
        categoria: p.categories?.split(',')[0] || null,
        image: p.image_url || p.image_front_url || null,
        source: 'openfoodfacts'
      };
    }
    return null;
  } catch {
    return null;
  }
}
