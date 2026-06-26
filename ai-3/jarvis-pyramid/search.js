import { miniFuseSearch } from './data.js';

export function wireSearch(sns) {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        const matched = query ? miniFuseSearch(query, sns) : [];
        sns.forEach(n => {
            if (!n.userData.origPos) n.userData.origPos = { x: n.position.x, y: n.position.y, z: n.position.z };
            const match = !query || matched.includes(n);
            const dz = !query ? 0 : (match ? -5 : 50);
            n.position.z = n.userData.origPos.z + dz;
            n.material.opacity = !query || match ? 1 : 0.03;
            if (n.userData.label) n.userData.label.position.z = n.position.z;
        });
    });
}
