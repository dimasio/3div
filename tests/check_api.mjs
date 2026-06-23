import { IfcAPI } from 'web-ifc';

const api = new IfcAPI();
console.log('IfcAPI methods:', Object.getOwnPropertyNames(IfcAPI.prototype).sort());
console.log('Has GetByType:', typeof api.GetByType);