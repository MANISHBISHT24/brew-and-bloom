"use client";

import { useMemo, useState } from "react";
import { Coffee, RotateCcw, Search, X } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import type { StoreProduct } from "@/lib/products";

export function MenuExplorer({ products }: { products: StoreProduct[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("popular");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((product) => product.category)))],
    [products]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set("All", products.length);
    for (const p of products) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  const visible = useMemo(
    () =>
      products
        .filter(
          (product) =>
            product.name.toLowerCase().includes(query.trim().toLowerCase()) ||
            product.description.toLowerCase().includes(query.trim().toLowerCase())
        )
        .filter((product) => category === "All" || product.category === category)
        .sort((a, b) =>
          sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : 0
        ),
    [products, query, category, sort]
  );

  const resetFilters = () => {
    setQuery("");
    setCategory("All");
    setSort("popular");
  };

  return (
    <>
      <div className="menu-controls" style={{ gap: 16 }}>
        <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
          <label htmlFor="menu-search" className="sr-only">
            Search coffee and menu
          </label>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
              pointerEvents: "none",
            }}
          />
          <input
            id="menu-search"
            className="input"
            style={{ paddingLeft: 46, paddingRight: query ? 42 : 16 }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search coffee, pastries…"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div>
          <label className="sr-only" htmlFor="menu-sort">
            Sort menu
          </label>
          <select
            className="input"
            style={{ width: "auto", minWidth: 180, cursor: "pointer" }}
            id="menu-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="popular">Sort: Featured</option>
            <option value="price-low">Price: Low to high</option>
            <option value="price-high">Price: High to low</option>
          </select>
        </div>
      </div>

      <div
        className="menu-controls"
        style={{ marginTop: 0, marginBottom: 36, gap: 10 }}
        aria-label="Filter by category"
      >
        {categories.map((item) => {
          const count = categoryCounts.get(item);
          return (
            <button
              type="button"
              key={item}
              className={`filter-button${category === item ? " active" : ""}`}
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
            >
              <span>{item}</span>
              {typeof count === "number" && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 9,
                    opacity: category === item ? 0.9 : 0.65,
                  }}
                >
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {visible.length ? (
        <div className="product-grid">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--cream)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
              color: "var(--coffee)",
            }}
          >
            <Coffee size={26} />
          </div>
          <h2>Nothing on the menu yet.</h2>
          <p>We couldn&apos;t find anything matching your search or filters.</p>
          <button
            type="button"
            className="button button-small button-outline"
            onClick={resetFilters}
          >
            <RotateCcw size={14} /> Reset all filters
          </button>
        </div>
      )}
    </>
  );
}
