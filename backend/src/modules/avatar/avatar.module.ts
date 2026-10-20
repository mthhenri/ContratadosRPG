import { Module } from "@nestjs/common";
import { FichaModule } from "../ficha/ficha.module";
import { EncontroModule } from "../encontro/encontro.module";
import { AvatarController } from "./avatar.controller";
import { AvatarService } from "./avatar.service";

@Module({ imports: [FichaModule, EncontroModule], controllers: [AvatarController], providers: [AvatarService] })
export class AvatarModule {}
