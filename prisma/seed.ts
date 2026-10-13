import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const products = [
  { slug:"house-espresso", name:"House Espresso", description:"A chocolate-forward, naturally sweet daily espresso.", category:"espresso", price:"180.00", featured:true, popularity:96, image:"https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=1000&q=85", alt:"Espresso in a ceramic cup", variants:[["Single","0.00"],["Double","60.00"]] },
  { slug:"oat-milk-latte", name:"Oat Milk Latte", description:"Silky steamed oat milk, a little sweetness, plenty of comfort.", category:"espresso", price:"260.00", featured:true, popularity:88, image:"https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1000&q=85", alt:"Latte with delicate milk art", variants:[["Regular","0.00"],["Large","50.00"]] },
  { slug:"slow-steep-cold-brew", name:"Slow Steep Cold Brew", description:"Patiently steeped, smooth, and finished over ice.", category:"cold-coffee", price:"240.00", featured:true, popularity:81, image:"https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1000&q=85", alt:"Iced coffee in the afternoon light", variants:[["Regular","0.00"],["Large","40.00"]] },
  { slug:"cardamom-morning-bun", name:"Cardamom Morning Bun", description:"Flaky layers, warm spice, and a delicate sugar crust.", category:"bakery", price:"190.00", featured:true, popularity:76, image:"https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1000&q=85", alt:"Freshly baked golden pastry", variants:[["Single","0.00"]] },
  { slug:"velvet-cappuccino", name:"Velvet Cappuccino", description:"A balanced espresso with soft, finely textured milk.", category:"espresso", price:"230.00", featured:false, popularity:68, image:"https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=1000&q=85", alt:"Cappuccino topped with soft foam", variants:[["Regular","0.00"],["Large","40.00"]] },
  { slug:"citrus-iced-matcha", name:"Citrus Iced Matcha", description:"A bright, gently whisked matcha over ice with fresh citrus.", category:"tea", price:"280.00", featured:false, popularity:57, image:"https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=1000&q=85", alt:"Iced green tea in a clear glass", variants:[["Regular","0.00"],["Large","50.00"]] },
];

async function main(){
  const categories=[{slug:"espresso",name:"Espresso & milk",sortOrder:1},{slug:"cold-coffee",name:"Cold coffee",sortOrder:2},{slug:"tea",name:"Tea & matcha",sortOrder:3},{slug:"bakery",name:"Bakery",sortOrder:4}];
  for(const category of categories)await prisma.category.upsert({where:{slug:category.slug},update:{name:category.name,sortOrder:category.sortOrder,isActive:true},create:category});
  for(const item of products){const category=await prisma.category.findUniqueOrThrow({where:{slug:item.category}});await prisma.product.upsert({where:{slug:item.slug},update:{name:item.name,description:item.description,basePrice:item.price,featured:item.featured,popularity:item.popularity,isAvailable:true,archivedAt:null},create:{slug:item.slug,name:item.name,description:item.description,basePrice:item.price,categoryId:category.id,featured:item.featured,popularity:item.popularity,images:{create:{url:item.image,alt:item.alt}},variants:{create:item.variants.map(([name,priceAdjustment],sortOrder)=>({name,priceAdjustment,sortOrder,isAvailable:true}))}}});
    const current=await prisma.product.findUniqueOrThrow({where:{slug:item.slug}});if(!await prisma.productImage.findFirst({where:{productId:current.id}}))await prisma.productImage.create({data:{productId:current.id,url:item.image,alt:item.alt}});
  }
  await prisma.storeSettings.upsert({where:{key:"default"},update:{},create:{key:"default",pickupEnabled:true,deliveryEnabled:false}});
}
main().then(()=>console.log("Brew & Bloom development catalogue seeded.")).catch((error)=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
