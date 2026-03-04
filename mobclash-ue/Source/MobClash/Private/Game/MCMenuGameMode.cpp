#include "Game/MCMenuGameMode.h"

#include "Player/MCMenuPlayerController.h"

AMCMenuGameMode::AMCMenuGameMode()
{
	PlayerControllerClass = AMCMenuPlayerController::StaticClass();
	DefaultPawnClass = nullptr;
	HUDClass = nullptr;
}
