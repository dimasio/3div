#!/usr/bin/env python3
"""
Генератор минимального IFC файла с геометрией для тестов.
Использует ifcopenshell для создания валидного IFC2X3 файла.
"""

import ifcopenshell
import os

def create_test_ifc():
    """Создает минимальный IFC файл с стеной и сеткой."""
    # Создаем новую модель IFC2X3
    model = ifcopenshell.file(schema='IFC2X3')
    
    # Создаем координаты для точки
    origin = model.create_entity('IfcCartesianPoint', Coordinates=[0.0, 0.0, 0.0])
    
    # Создаем направление Z
    z_dir = model.create_entity('IfcDirection', DirectionRatios=[0.0, 0.0, 1.0])
    
    # Создаем контекст представления (обязательно для геометрии)
    context = model.create_entity('IfcGeometricRepresentationContext', ContextType='Model')
    
    # Создаем осевую линию для стены
    wall_placement = model.create_entity('IfcAxis2Placement3D', Location=origin, Axis=z_dir)
    
    # Создаем прямоугольный профиль 5x3 метра
    profile = model.create_entity('IfcRectangleProfileDef', 
                                  ProfileType='AREA',
                                  ProfileName='RectProfile',
                                  XDim=5.0,
                                  YDim=3.0)
    
    # Создаем тело стены через выдавливание (IFC2X3: ExtrudedAreaSolid)
    # Позиционные аргументы: SweptArea, Position, Axis, Depth
    solid = model.create_entity('IfcExtrudedAreaSolid', profile, wall_placement, z_dir, 3.0)
    
    # Создаем геометрическое представление
    shape = model.create_entity('IfcShapeRepresentation',
                                ContextOfItems=context,
                                RepresentationIdentifier='Body',
                                RepresentationType='SweptSolid',
                                Items=[solid])
    
    # Создаем стену с геометрическим представлением
    wall = model.create_entity('IfcWall', 
                               GlobalId=ifcopenshell.guid.new(), 
                               Name='TestWall',
                               ObjectPlacement=wall_placement,
                               Representation=shape)
    
    # Создаем сетку (в IFC2X3 просто осевая линия)
    grid = model.create_entity('IfcGrid',
                               GlobalId=ifcopenshell.guid.new(),
                               Name='TestGrid')
    
    model.write('tests/fixtures/minimal_with_geom.ifc')
    print("IFC файл создан: tests/fixtures/minimal_with_geom.ifc")
    
    # Получаем размер файла
    size = os.path.getsize('tests/fixtures/minimal_with_geom.ifc')
    print(f"Размер файла: {size} байт")

if __name__ == '__main__':
    create_test_ifc()