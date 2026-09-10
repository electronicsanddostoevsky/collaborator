"""Trusted Blender adapter. Model output is data, never Python code."""
import json, math, sys
from pathlib import Path

def validate(plan):
    if not isinstance(plan, dict) or set(plan) != {'objects'}:
        raise ValueError('The model must return a scene with objects.')
    objects = plan['objects']
    if not isinstance(objects, list) or not 1 <= len(objects) <= 48:
        raise ValueError('Use between 1 and 48 objects.')
    for obj in objects:
        if not isinstance(obj, dict) or set(obj) != {'name','shape','position','rotation','scale','color'}:
            raise ValueError('An object has unsupported fields.')
        if not isinstance(obj['name'], str) or not 1 <= len(obj['name']) <= 80:
            raise ValueError('Object names must be short.')
        if obj['shape'] not in ('cube','sphere','cylinder','cone','torus'):
            raise ValueError('Unsupported shape.')
        for key, lower, upper in [('position',-20,20),('rotation',-360,360),('scale',0.05,10),('color',0,1)]:
            values=obj[key]
            if not isinstance(values,list) or len(values)!=3 or any(type(v) not in (int,float) or not math.isfinite(v) or not lower<=v<=upper for v in values):
                raise ValueError('Invalid '+key)
    return plan

def build(directory):
    import bpy
    from mathutils import Vector
    root=Path(directory).resolve()
    plan=validate(json.loads((root/'scene.json').read_text(encoding='utf-8')))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for item in plan['objects']:
        shape=item['shape']
        if shape=='cube': bpy.ops.mesh.primitive_cube_add()
        elif shape=='sphere': bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12)
        elif shape=='cylinder': bpy.ops.mesh.primitive_cylinder_add(vertices=24)
        elif shape=='cone': bpy.ops.mesh.primitive_cone_add(vertices=24)
        else: bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=12)
        obj=bpy.context.object
        obj.name=item['name'];obj.location=item['position'];obj.scale=item['scale']
        obj.rotation_euler=[math.radians(v) for v in item['rotation']]
        mat=bpy.data.materials.new(item['name']);mat.diffuse_color=(*item['color'],1)
        mat.use_nodes=True
        shader=mat.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value=(*item['color'],1)
        shader.inputs['Roughness'].default_value=0.65
        obj.data.materials.append(mat)
    bpy.context.view_layer.update()
    points=[obj.matrix_world@Vector(c) for obj in bpy.context.scene.objects if obj.type=='MESH' for c in obj.bound_box]
    low=Vector([min(p[i] for p in points) for i in range(3)])
    high=Vector([max(p[i] for p in points) for i in range(3)])
    center=(low+high)/2; radius=max((high-low).length/2,1)
    bpy.ops.object.camera_add(location=center+Vector((1.4,-2,1.25)).normalized()*radius*3)
    camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=radius*2.4;bpy.context.scene.camera=camera
    bpy.ops.object.light_add(type='SUN',location=(0,0,10));bpy.context.object.rotation_euler=(0.4,-0.4,-0.4);bpy.context.object.data.energy=3
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
    scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Workshop');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(0.12,0.15,0.12,1)
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(root/'preview.png')
    bpy.ops.wm.save_as_mainfile(filepath=str(root/'artifact.blend'))
    bpy.ops.render.render(write_still=True)

if __name__=='__main__': build(sys.argv[sys.argv.index('--')+1])
