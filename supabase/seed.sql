-- Safe demo seed for PriceCheck AI V10.
insert into retailers (id,name,website,active) values
('00000000-0000-0000-0000-000000000001','Wootware','https://www.wootware.co.za',true),
('00000000-0000-0000-0000-000000000002','Takealot','https://www.takealot.com',true),
('00000000-0000-0000-0000-000000000003','Evetech','https://www.evetech.co.za',true)
on conflict (id) do nothing;

insert into products (id,canonical_name,brand,model,category,specs) values
('10000000-0000-0000-0000-000000000001','SK hynix 16GB DDR4-3200 SO-DIMM','SK hynix','HMA82GS6DJR8N-XN','ram','{"capacity":"16GB","type":"DDR4","speed":"3200 MT/s","form_factor":"SO-DIMM"}'),
('10000000-0000-0000-0000-000000000002','Kingston 1TB NVMe SSD','Kingston','NV2','ssd','{"capacity":"1TB","interface":"NVMe","form_factor":"M.2"}'),
('10000000-0000-0000-0000-000000000003','RTX 4060 8GB Graphics Card','NVIDIA','RTX 4060','gpu','{"memory":"8GB GDDR6","interface":"PCIe"}')
on conflict (id) do nothing;

insert into offers (id,product_id,retailer_id,url,price_zar,in_stock) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','https://www.wootware.co.za/',699,true),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','https://www.takealot.com/',749,true),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','https://www.takealot.com/',1099,true),
('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','https://www.evetech.co.za/',6499,true)
on conflict (id) do nothing;

insert into price_history (offer_id,price_zar) select id,price_zar from offers
on conflict do nothing;
