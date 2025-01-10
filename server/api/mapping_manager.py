import os
from time import time
import json
import logging
from pathlib import Path
import base64
import glob

logger = logging.getLogger(__name__)

class MapManager:
    def __init__(self, rover_code, folder, imsize):
        self.rover_code = rover_code
        self.folder = folder
        self.imsize = imsize  # [lines, columns]

        # Criar diretório se não existir
        os.makedirs(folder, exist_ok=True)
        logger.info(f"Initialized MapManager for rover {rover_code} in folder {folder}")

    def get_pcd_files(self):
        """
        Busca todos os arquivos .pcd no diretório de mapas
        """
        map_dir = os.path.join(self.folder, "maps/map_1")
        pcd_files = glob.glob(os.path.join(map_dir, "*.pcd"))
        logger.info(f"Found {len(pcd_files)} PCD files in {map_dir}")
        return sorted(pcd_files)

    def generateMapPtc(self):
        """
        Gera o mapa de nuvem de pontos.
        """
        pcd_files = self.get_pcd_files()
        logger.info(f"Processing {len(pcd_files)} PCD files")

        if not pcd_files:
            logger.warning("No PCD files found")
            return None

        # TODO: Implementar o processamento real dos arquivos PCD
        # Por enquanto vamos apenas simular o processamento
        return {"files": pcd_files}

    def generateMapBev(self, ptc_map_frame):
        """
        Gera o mapa bird's eye view.
        Por enquanto retorna um mapa simulado.
        """
        if not ptc_map_frame:
            return None, None

        # TODO: Implementar a geração real do mapa BEV
        # Por enquanto vamos apenas simular
        map_coords = {
            "origin": [0, 0],
            "resolution": 0.05,
            "size": self.imsize
        }

        return "simulated_map", json.dumps(map_coords)

    def saveMap(self, map_bev, map_ptc, map_coords):
        """
        Salva os arquivos do mapa.
        """
        try:
            # Salvar informações do processamento
            info = {
                "processed_at": time(),
                "num_files": len(map_ptc["files"]) if map_ptc else 0,
                "coords": map_coords
            }

            info_path = os.path.join(self.folder, "map_info.json")
            with open(info_path, 'w') as f:
                json.dump(info, f)

            logger.info(f"Map information saved to {info_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving map files: {str(e)}")
            return False

    @staticmethod
    def process_mapping(rover_id, base_folder="/tmp/rover_maps"):
        """
        Processa o mapeamento para um rover específico.
        """
        try:
            start = time()

            # Criar pasta específica para o rover
            rover_folder = os.path.join(base_folder, f"rover_{rover_id}")
            os.makedirs(rover_folder, exist_ok=True)

            # Configurações do mapa
            rover_code = int(rover_id.split('-')[-1])  # Extrai o número do rover do ID
            desired_map_size = [1080, 1920]  # [lines, columns]

            # Criar o gerenciador de mapa
            map_manager = MapManager(
                rover_code=rover_code,
                folder=rover_folder,
                imsize=desired_map_size
            )

            # Verificar se existem arquivos PCD
            pcd_files = map_manager.get_pcd_files()
            if not pcd_files:
                raise Exception("Nenhum arquivo PCD encontrado no diretório especificado")

            # Gerar os mapas
            map_ptc = map_manager.generateMapPtc()
            map_bev, map_coords_json = map_manager.generateMapBev(ptc_map_frame=map_ptc)

            # Salvar os arquivos
            success = map_manager.saveMap(
                map_bev=map_bev,
                map_ptc=map_ptc,
                map_coords=map_coords_json
            )

            if not success:
                raise Exception("Falha ao salvar os arquivos do mapa")

            end = time()
            processing_time = end - start

            logger.info(f"Mapping processed successfully in {processing_time:.2f} seconds")
            return True, processing_time

        except Exception as e:
            logger.error(f"Error processing mapping: {str(e)}", exc_info=True)
            return False, str(e)
